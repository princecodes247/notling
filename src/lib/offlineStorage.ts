export interface OfflineDraft {
  content: any[];
  contentText: string;
  timestamp: number;
}

const DRAFT_PREFIX = 'notling_offline_draft_';

/**
 * Retrieves the cached offline draft for a specific page from localStorage, if present.
 */
export function getOfflineDraft(pageId: string | null | undefined): OfflineDraft | null {
  if (typeof window === 'undefined' || !pageId) return null;
  try {
    const raw = localStorage.getItem(`${DRAFT_PREFIX}${pageId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.content) && parsed.content.length > 0) {
      return parsed as OfflineDraft;
    }
  } catch (err) {
    console.error(`Failed to read offline draft for page ${pageId}:`, err);
  }
  return null;
}

/**
 * Saves or updates an offline draft for a page in localStorage.
 */
export function saveOfflineDraft(
  pageId: string | null | undefined,
  content: any[],
  contentText: string
): void {
  if (typeof window === 'undefined' || !pageId) return;
  try {
    const draft: OfflineDraft = {
      content,
      contentText,
      timestamp: Date.now(),
    };
    localStorage.setItem(`${DRAFT_PREFIX}${pageId}`, JSON.stringify(draft));
  } catch (err) {
    console.error(`Failed to save offline draft for page ${pageId}:`, err);
  }
}

/**
 * Removes the cached offline draft for a specific page.
 */
export function clearOfflineDraft(pageId: string | null | undefined): void {
  if (typeof window === 'undefined' || !pageId) return;
  try {
    localStorage.removeItem(`${DRAFT_PREFIX}${pageId}`);
  } catch (err) {
    console.error(`Failed to clear offline draft for page ${pageId}:`, err);
  }
}

/**
 * Returns true if an offline draft exists for the given page.
 */
export function hasOfflineDraft(pageId: string | null | undefined): boolean {
  return getOfflineDraft(pageId) !== null;
}
