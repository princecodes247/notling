import { db } from '~/db';
import { pages, workspaces, users } from '~/db/schema';
import { eq, and, sql, desc, asc, isNull } from 'drizzle-orm';
import type { PageTreeNode } from './pages';

// Ensure a default user & workspace exist for demo/dev purposes
export async function getOrCreateDefaultWorkspace() {
  try {
    const existingUsers = await db.select().from(users).limit(1);
    let user = existingUsers[0];

    if (!user) {
      const [newUser] = await db.insert(users).values({
        email: 'demo@notling.dev',
        name: 'Prince (Workspace Owner)',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Prince',
        provider: 'dev',
        providerAccountId: 'dev-owner-1',
      }).returning();
      user = newUser;
    }

    const existingWorkspaces = await db.select().from(workspaces).where(eq(workspaces.ownerId, user.id)).limit(1);
    let workspace = existingWorkspaces[0];

    if (!workspace) {
      const [newWs] = await db.insert(workspaces).values({
        ownerId: user.id,
        name: "Prince's Workspace",
      }).returning();
      workspace = newWs;

      // Create a welcome root page with initial block content
      const [welcomePage] = await db.insert(pages).values({
        workspaceId: workspace.id,
        title: '🚀 Getting Started with Notling',
        icon: '👋',
        order: 0,
        content: [
          {
            id: 'welcome-1',
            type: 'heading',
            props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left', level: 1 },
            content: [{ type: 'text', text: 'Welcome to Notling!', styles: {} }],
            children: []
          },
          {
            id: 'welcome-2',
            type: 'paragraph',
            props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
            content: [{ type: 'text', text: 'Notling is your simplified, lightning-fast Notion alternative. Everything is organized in a nested page tree with block-based editing and instant full-text search.', styles: {} }],
            children: []
          },
          {
            id: 'welcome-3',
            type: 'bulletListItem',
            props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
            content: [{ type: 'text', text: 'Create nested pages by clicking the + button on any page in the sidebar.', styles: { bold: true } }],
            children: []
          },
          {
            id: 'welcome-4',
            type: 'bulletListItem',
            props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
            content: [{ type: 'text', text: 'Press Cmd+K (or Ctrl+K) anytime to open the full-text command search.', styles: { bold: true } }],
            children: []
          },
          {
            id: 'welcome-5',
            type: 'bulletListItem',
            props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
            content: [{ type: 'text', text: 'Autosave works seamlessly in the background while you type.', styles: { bold: true } }],
            children: []
          }
        ],
        contentText: 'Welcome to Notling! Notling is your simplified, lightning-fast Notion alternative. Everything is organized in a nested page tree with block-based editing and instant full-text search. Create nested pages by clicking the + button on any page in the sidebar. Press Cmd+K (or Ctrl+K) anytime to open the full-text command search. Autosave works seamlessly in the background while you type.',
      }).returning();

      // Create a child sample page
      await db.insert(pages).values({
        workspaceId: workspace.id,
        parentId: welcomePage.id,
        title: '📝 Meeting Notes',
        icon: '📌',
        order: 0,
        content: [
          {
            id: 'meeting-1',
            type: 'heading',
            props: { level: 2 },
            content: [{ type: 'text', text: 'Sprint Planning Notes', styles: {} }],
            children: []
          },
          {
            id: 'meeting-2',
            type: 'checkListItem',
            props: { checked: true },
            content: [{ type: 'text', text: 'Define v1 scope & database schema', styles: {} }],
            children: []
          },
          {
            id: 'meeting-3',
            type: 'checkListItem',
            props: { checked: false },
            content: [{ type: 'text', text: 'Setup Postgres full-text search index', styles: {} }],
            children: []
          }
        ],
        contentText: 'Sprint Planning Notes Define v1 scope & database schema Setup Postgres full-text search index',
      });
    }

    // Ensure "Agentic Development Workshop NYC" page exists
    const existingAgentic = await db
      .select()
      .from(pages)
      .where(and(eq(pages.workspaceId, workspace.id), eq(pages.title, 'Agentic Development Workshop NYC'), isNull(pages.deletedAt)))
      .limit(1);

    if (existingAgentic.length === 0) {
      const [workshopPage] = await db.insert(pages).values({
        workspaceId: workspace.id,
        title: 'Agentic Development Workshop NYC',
        icon: '⚡',
        order: 0,
        content: [
          {
            id: 'ws-h1',
            type: 'heading',
            props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left', level: 1 },
            content: [{ type: 'text', text: 'Agentic Development Workshop NYC', styles: {} }],
            children: []
          },
          {
            id: 'ws-p1',
            type: 'paragraph',
            props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
            content: [{ type: 'text', text: 'Collaborate with teammates and event agents to stay aligned and under budget.', styles: {} }],
            children: []
          }
        ],
        contentText: 'Agentic Development Workshop NYC Collaborate with teammates and event agents to stay aligned and under budget.',
      }).returning();

      // Insert sub-pages
      await db.insert(pages).values([
        {
          workspaceId: workspace.id,
          parentId: workshopPage.id,
          title: 'Venue & Logistics',
          icon: '📍',
          order: 0,
          content: [{ id: 'sub-1', type: 'paragraph', props: {}, content: [{ type: 'text', text: 'Spring Street Studios reservation confirmed for May 2026.', styles: {} }], children: [] }],
          contentText: 'Spring Street Studios reservation confirmed for May 2026.',
        },
        {
          workspaceId: workspace.id,
          parentId: workshopPage.id,
          title: 'Workshop Curriculum',
          icon: '📋',
          order: 1,
          content: [{ id: 'sub-2', type: 'paragraph', props: {}, content: [{ type: 'text', text: 'Module 1: Agentic architecture. Module 2: Tool calling and evaluation.', styles: {} }], children: [] }],
          contentText: 'Module 1: Agentic architecture. Module 2: Tool calling and evaluation.',
        },
        {
          workspaceId: workspace.id,
          parentId: workshopPage.id,
          title: 'Speaker Outreach',
          icon: '🎤',
          order: 2,
          content: [{ id: 'sub-3', type: 'paragraph', props: {}, content: [{ type: 'text', text: '12 invitations sent to keynote speakers.', styles: {} }], children: [] }],
          contentText: '12 invitations sent to keynote speakers.',
        },
        {
          workspaceId: workspace.id,
          parentId: workshopPage.id,
          title: 'Registration Launch',
          icon: '🎟️',
          order: 3,
          content: [{ id: 'sub-4', type: 'paragraph', props: {}, content: [{ type: 'text', text: 'Early bird tickets opening May 9, 2026.', styles: {} }], children: [] }],
          contentText: 'Early bird tickets opening May 9, 2026.',
        }
      ]);
    }

    return { user, workspace };
  } catch (err) {
    console.error('Database connection error in getOrCreateDefaultWorkspace:', err);
    return {
      user: { id: '00000000-0000-0000-0000-000000000001', email: 'demo@notling.dev', name: 'Prince (Workspace Owner)', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Prince', provider: 'dev', providerAccountId: 'dev-owner-1', createdAt: new Date() },
      workspace: { id: '00000000-0000-0000-0000-000000000002', ownerId: '00000000-0000-0000-0000-000000000001', name: "Prince's Workspace", createdAt: new Date() },
    };
  }
}

async function resolveWorkspaceId(providedWorkspaceId?: string): Promise<string> {
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
      // If query fails (e.g. invalid UUID format or missing record), fall through
    }
  }
  const { workspace } = await getOrCreateDefaultWorkspace();
  return workspace.id;
}

export async function fetchPageTree(workspaceId: string): Promise<PageTreeNode[]> {
  try {
    const targetWorkspaceId = await resolveWorkspaceId(workspaceId);

    const allPages = await db
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
      .where(and(eq(pages.workspaceId, targetWorkspaceId), eq(pages.isDeleted, false)))
      .orderBy(asc(pages.order), asc(pages.createdAt));

    const pageMap = new Map<string, PageTreeNode>();
    const rootNodes: PageTreeNode[] = [];

    for (const page of allPages) {
      pageMap.set(page.id, { ...page, children: [] });
    }

    for (const page of allPages) {
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
    return pageList[0];
  } catch (err) {
    console.error('Error fetching page:', err);
    return null;
  }
}

export async function createNewPage(input: { workspaceId: string; parentId?: string | null; title?: string; icon?: string }) {
  try {
    const targetWorkspaceId = await resolveWorkspaceId(input.workspaceId);

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
