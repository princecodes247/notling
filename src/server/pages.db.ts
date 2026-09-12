import { db } from '~/db';
import { pages, workspaces, pageShares } from '~/db/schema';
import { eq, and, sql, desc, asc, isNull } from 'drizzle-orm';
import type { PageTreeNode } from './pages';
import { getSessionImpl } from './auth.db';


async function resolveWorkspaceId(providedWorkspaceId?: string): Promise<string | null> {
  if (providedWorkspaceId) {
    try {
      const existing = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.id, providedWorkspaceId))
        .limit(1);
      if (existing.length > 0) {
        return existing[0].id;
      }
    } catch {
      // Invalid UUID or missing
    }
  }
  return null;
}

export async function fetchPageTree(workspaceId: string): Promise<PageTreeNode[]> {
  try {
    const targetWorkspaceId = await resolveWorkspaceId(workspaceId);
    if (!targetWorkspaceId) return [];

    const session = await getSessionImpl();

    const allPages = await db
      .select({
        id: pages.id,
        workspaceId: pages.workspaceId,
        parentId: pages.parentId,
        title: pages.title,
        icon: pages.icon,
        visibility: pages.visibility,
        order: pages.order,
        createdAt: pages.createdAt,
        updatedAt: pages.updatedAt,
        contentText: pages.contentText,
      })
      .from(pages)
      .where(and(eq(pages.workspaceId, targetWorkspaceId), eq(pages.isDeleted, false)))
      .orderBy(asc(pages.order), asc(pages.createdAt));

    const visiblePages = allPages.filter((page) => {
      if (session && session.workspaceId === page.workspaceId) {
        return true;
      }
      return page.visibility === 'public';
    });

    const pageMap = new Map<string, PageTreeNode>();
    const rootNodes: PageTreeNode[] = [];

    for (const page of visiblePages) {
      pageMap.set(page.id, { ...page, children: [] });
    }

    for (const page of visiblePages) {
      const node = pageMap.get(page.id)!;
      if (page.parentId && pageMap.has(page.parentId)) {
        pageMap.get(page.parentId)!.children.push(node);
      } else {
        rootNodes.push(node);
      }
    }

    return rootNodes;
  } catch (err) {
    console.error('Error fetching page tree:', err);
    return [];
  }
}

export async function fetchPage(pageId: string) {
  try {
    const pageList = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
    if (pageList.length === 0) return null;
    const page = pageList[0];

    const session = await getSessionImpl();
    if (page.visibility === 'public') {
      return page;
    }
    if (session && session.workspaceId === page.workspaceId) {
      return page;
    }
    return null;
  } catch (err) {
    console.error('Error fetching page:', err);
    return null;
  }
}

export interface SharedPageData {
  page: typeof pages.$inferSelect;
  accessLevel: 'editor' | 'viewer';
  isLoggedIn: boolean;
  userEmail: string | null;
  isWorkspaceMember: boolean;
}

export async function fetchPublicPage(pageId: string): Promise<SharedPageData | null> {
  try {
    const pageList = await db
      .select()
      .from(pages)
      .where(and(eq(pages.id, pageId), eq(pages.isDeleted, false)))
      .limit(1);

    if (pageList.length === 0) return null;
    const page = pageList[0];

    const session = await getSessionImpl();
    const userEmail = session?.email ? session.email.trim().toLowerCase() : null;

    let userShare: { role: 'viewer' | 'editor' } | null = null;
    if (userEmail) {
      const shares = await db
        .select({ role: pageShares.role })
        .from(pageShares)
        .where(and(eq(pageShares.pageId, pageId), eq(pageShares.email, userEmail)))
        .limit(1);

      if (shares.length > 0) {
        userShare = shares[0];
      }
    }

    const isWorkspaceMember = !!(session && session.workspaceId === page.workspaceId);

    let accessLevel: 'editor' | 'viewer' | null = null;

    if (isWorkspaceMember) {
      accessLevel = 'editor';
    } else if (userShare) {
      accessLevel = userShare.role;
    } else if (page.visibility === 'public') {
      accessLevel = 'viewer';
    }

    if (!accessLevel) {
      return null;
    }

    return {
      page,
      accessLevel,
      isLoggedIn: !!session,
      userEmail,
      isWorkspaceMember,
    };
  } catch (err) {
    console.error('Error fetching public page:', err);
    return null;
  }
}

export async function createNewPage(input: {
  workspaceId: string;
  parentId?: string | null;
  title?: string;
  icon?: string;
  visibility?: 'private' | 'workspace' | 'public';
}) {
  try {
    const targetWorkspaceId = await resolveWorkspaceId(input.workspaceId);
    if (!targetWorkspaceId) return null;

    const existingInParent = await db
      .select({ order: pages.order })
      .from(pages)
      .where(
        and(
          eq(pages.workspaceId, targetWorkspaceId),
          input.parentId ? eq(pages.parentId, input.parentId) : isNull(pages.parentId),
          eq(pages.isDeleted, false)
        )
      )
      .orderBy(desc(pages.order))
      .limit(1);

    const nextOrder = existingInParent.length > 0 ? existingInParent[0].order + 1 : 0;

    const [newPage] = await db
      .insert(pages)
      .values({
        workspaceId: targetWorkspaceId,
        parentId: input.parentId || null,
        title: input.title || 'Untitled',
        icon: input.icon || '📄',
        visibility: input.visibility || 'workspace',
        order: nextOrder,
        content: [],
        contentText: '',
      })
      .returning();

    return newPage;
  } catch (err) {
    console.error('Error creating page:', err);
    return null;
  }
}

export async function savePageContent(input: { pageId: string; content: any; contentText: string }) {
  try {
    const [updated] = await db
      .update(pages)
      .set({
        content: input.content,
        contentText: input.contentText,
        updatedAt: new Date(),
      })
      .where(eq(pages.id, input.pageId))
      .returning({ id: pages.id, updatedAt: pages.updatedAt });

    return updated;
  } catch (err) {
    console.error('Error updating page content:', err);
    return null;
  }
}

export async function savePageMeta(input: { pageId: string; title?: string; icon?: string | null }) {
  try {
    const updatePayload: Record<string, any> = { updatedAt: new Date() };
    if (input.title !== undefined) updatePayload.title = input.title;
    if (input.icon !== undefined) updatePayload.icon = input.icon;

    const [updated] = await db
      .update(pages)
      .set(updatePayload)
      .where(eq(pages.id, input.pageId))
      .returning();

    return updated;
  } catch (err) {
    console.error('Error updating page meta:', err);
    return null;
  }
}

export async function savePageVisibility(input: { pageId: string; visibility: 'private' | 'workspace' | 'public' }) {
  try {
    const [updated] = await db
      .update(pages)
      .set({
        visibility: input.visibility,
        updatedAt: new Date(),
      })
      .where(eq(pages.id, input.pageId))
      .returning();

    return updated;
  } catch (err) {
    console.error('Error updating page visibility:', err);
    return null;
  }
}

export async function performSoftDelete(pageId: string) {
  try {
    const softDeleteRecursive = async (id: string) => {
      await db
        .update(pages)
        .set({ isDeleted: true, deletedAt: new Date() })
        .where(eq(pages.id, id));

      const children = await db.select({ id: pages.id }).from(pages).where(eq(pages.parentId, id));
      for (const child of children) {
        await softDeleteRecursive(child.id);
      }
    };

    await softDeleteRecursive(pageId);
    return { success: true };
  } catch (err) {
    console.error('Error soft deleting page:', err);
    return { success: false };
  }
}

export async function performRestore(pageId: string) {
  try {
    const restoreRecursive = async (id: string) => {
      await db
        .update(pages)
        .set({ isDeleted: false, deletedAt: null })
        .where(eq(pages.id, id));

      const children = await db.select({ id: pages.id }).from(pages).where(eq(pages.parentId, id));
      for (const child of children) {
        await restoreRecursive(child.id);
      }
    };

    await restoreRecursive(pageId);
    return { success: true };
  } catch (err) {
    console.error('Error restoring page:', err);
    return { success: false };
  }
}

export async function fetchTrashPages(workspaceId: string) {
  try {
    const targetWorkspaceId = await resolveWorkspaceId(workspaceId);
    if (!targetWorkspaceId) return [];
    return await db
      .select({
        id: pages.id,
        title: pages.title,
        icon: pages.icon,
        deletedAt: pages.deletedAt,
      })
      .from(pages)
      .where(and(eq(pages.workspaceId, targetWorkspaceId), eq(pages.isDeleted, true)))
      .orderBy(desc(pages.deletedAt));
  } catch (err) {
    console.error('Error fetching trash pages:', err);
    return [];
  }
}

export async function performPermanentDelete(pageId: string) {
  try {
    await db.delete(pages).where(eq(pages.id, pageId));
    return { success: true };
  } catch (err) {
    console.error('Error permanent deleting page:', err);
    return { success: false };
  }
}

export async function performSearchPages(workspaceId: string, query: string) {
  try {
    if (!query || !query.trim()) return [];

    const targetWorkspaceId = await resolveWorkspaceId(workspaceId);
    if (!targetWorkspaceId) return [];

    const formattedQuery = query
      .trim()
      .split(/\s+/)
      .map((w: string) => `${w}:*`)
      .join(' & ');

    const results = await db
      .select({
        id: pages.id,
        title: pages.title,
        icon: pages.icon,
        contentText: pages.contentText,
        updatedAt: pages.updatedAt,
      })
      .from(pages)
      .where(
        and(
          eq(pages.workspaceId, targetWorkspaceId),
          eq(pages.isDeleted, false),
          sql`to_tsvector('english', coalesce(${pages.title}, '') || ' ' || coalesce(${pages.contentText}, '')) @@ to_tsquery('english', ${formattedQuery})`
        )
      )
      .orderBy(desc(pages.updatedAt))
      .limit(15);

    return results;
  } catch (err) {
    console.error('Error searching pages:', err);
    return [];
  }
}

export async function fetchChildPages(parentId: string) {
  try {
    return await db
      .select({
        id: pages.id,
        workspaceId: pages.workspaceId,
        parentId: pages.parentId,
        title: pages.title,
        icon: pages.icon,
        order: pages.order,
        createdAt: pages.createdAt,
        updatedAt: pages.updatedAt,
      })
      .from(pages)
      .where(and(eq(pages.parentId, parentId), eq(pages.isDeleted, false)))
      .orderBy(asc(pages.order), asc(pages.createdAt));
  } catch (err) {
    console.error('Error fetching child pages:', err);
    return [];
  }
}

export async function fetchPageShares(pageId: string) {
  try {
    return await db
      .select({
        id: pageShares.id,
        pageId: pageShares.pageId,
        email: pageShares.email,
        role: pageShares.role,
        createdAt: pageShares.createdAt,
      })
      .from(pageShares)
      .where(eq(pageShares.pageId, pageId))
      .orderBy(asc(pageShares.createdAt));
  } catch (err) {
    console.error('Error fetching page shares:', err);
    return [];
  }
}

export async function inviteUserToPage(input: {
  pageId: string;
  email: string;
  role: 'viewer' | 'editor';
}) {
  try {
    const cleanEmail = input.email.trim().toLowerCase();
    if (!cleanEmail) return null;

    const existing = await db
      .select()
      .from(pageShares)
      .where(and(eq(pageShares.pageId, input.pageId), eq(pageShares.email, cleanEmail)))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(pageShares)
        .set({ role: input.role })
        .where(eq(pageShares.id, existing[0].id))
        .returning();
      return updated;
    }

    const [newShare] = await db
      .insert(pageShares)
      .values({
        pageId: input.pageId,
        email: cleanEmail,
        role: input.role,
      })
      .returning();

    return newShare;
  } catch (err) {
    console.error('Error inviting user to page:', err);
    return null;
  }
}

export async function removePageShare(shareId: string) {
  try {
    await db.delete(pageShares).where(eq(pageShares.id, shareId));
    return { success: true };
  } catch (err) {
    console.error('Error removing page share:', err);
    return { success: false };
  }
}

export async function updatePageShareRole(input: { shareId: string; role: 'viewer' | 'editor' }) {
  try {
    const [updated] = await db
      .update(pageShares)
      .set({ role: input.role })
      .where(eq(pageShares.id, input.shareId))
      .returning();
    return updated;
  } catch (err) {
    console.error('Error updating page share role:', err);
    return null;
  }
}

