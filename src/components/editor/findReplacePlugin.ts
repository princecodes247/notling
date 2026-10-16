import type { Node } from 'prosemirror-model';
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view';

export interface SearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

export interface SearchMatch {
  id: string;
  from: number;
  to: number;
  text: string;
}

export const searchPluginKey = new PluginKey<DecorationSet>('findAndReplacePlugin');

/**
 * Searches the ProseMirror document for text matching the given query,
 * respecting case sensitivity and whole word boundaries.
 * Accurately maps character indices across inline marks (bold, italic, code, links).
 */
export function findMatchesInDoc(
  doc: Node,
  query: string,
  options: SearchOptions = {}
): SearchMatch[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let pattern = escapeRegex(query);
  if (options.wholeWord) {
    pattern = `\\b${pattern}\\b`;
  }

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, options.caseSensitive ? 'g' : 'gi');
  } catch {
    return [];
  }

  const matches: SearchMatch[] = [];
  let matchId = 0;

  doc.descendants((node, pos) => {
    if (node.isTextblock) {
      const charPosMap: number[] = [];
      let text = '';

      node.forEach((child, offset) => {
        if (child.isText && child.text) {
          const childStartPos = pos + 1 + offset;
          for (let i = 0; i < child.text.length; i++) {
            charPosMap.push(childStartPos + i);
          }
          text += child.text;
        } else {
          const inlineSize = child.nodeSize;
          const childStartPos = pos + 1 + offset;
          for (let i = 0; i < inlineSize; i++) {
            charPosMap.push(childStartPos + i);
          }
          text += ' '.repeat(inlineSize);
        }
      });

      if (text.length > 0) {
        regex.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
          const startIdx = match.index;
          const matchLen = match[0].length;
          if (matchLen === 0) {
            regex.lastIndex++;
            continue;
          }
          const endIdx = startIdx + matchLen;
          const from = charPosMap[startIdx];
          const to = charPosMap[endIdx - 1] + 1;

          if (from !== undefined && to !== undefined && from < to) {
            matches.push({
              id: `match-${matchId++}`,
              from,
              to,
              text: match[0],
            });
          }
        }
      }
      return false; // Don't descend into inline children
    }
    return true;
  });

  return matches;
}

/**
 * Creates the ProseMirror decoration plugin that renders search match highlights.
 */
export function createSearchPlugin() {
  return new Plugin<DecorationSet>({
    key: searchPluginKey,
    state: {
      init() {
        return DecorationSet.empty;
      },
      apply(tr, oldDecos) {
        const meta = tr.getMeta(searchPluginKey);
        if (meta !== undefined) {
          return meta;
        }
        return oldDecos.map(tr.mapping, tr.doc);
      },
    },
    props: {
      decorations(state) {
        return searchPluginKey.getState(state);
      },
    },
  });
}

/**
 * Builds decoration set for all matches, styling the active match with a distinct border/glow.
 */
export function buildSearchDecorations(
  doc: Node,
  matches: SearchMatch[],
  activeIndex: number
): DecorationSet {
  if (matches.length === 0) return DecorationSet.empty;

  const decos: Decoration[] = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const isActive = i === activeIndex;
    decos.push(
      Decoration.inline(match.from, match.to, {
        class: isActive ? 'bn-search-match bn-search-match-active' : 'bn-search-match',
        'data-search-index': String(i),
      })
    );
  }

  return DecorationSet.create(doc, decos);
}

/**
 * Ensures the search decoration plugin is safely registered on the editor instance
 * only when the DOM view is ready.
 */
export function ensureSearchPlugin(editor: any): boolean {
  if (!editor) return false;
  const tt = editor._tiptapEditor;
  const view = editor.prosemirrorView || tt?.view;
  if (!tt || !view) return false;

  const isRegistered = searchPluginKey.get(view.state) !== undefined;
  if (!isRegistered) {
    try {
      tt.registerPlugin(createSearchPlugin());
      return true;
    } catch (e) {
      console.warn('Could not register search plugin:', e);
      return false;
    }
  }
  return true;
}

/**
 * Updates decorations in the ProseMirror view without altering doc content or dirtying history.
 */
export function updateSearchDecorations(
  view: EditorView,
  matches: SearchMatch[],
  activeIndex: number
) {
  if (!view || !view.state) return;
  if (searchPluginKey.get(view.state) === undefined) return;

  const decos = buildSearchDecorations(view.state.doc, matches, activeIndex);
  const tr = view.state.tr.setMeta(searchPluginKey, decos);
  view.dispatch(tr);
}

/**
 * Clears all search match decorations from the ProseMirror view.
 */
export function clearSearchDecorations(view: EditorView) {
  if (!view || !view.state) return;
  if (searchPluginKey.get(view.state) === undefined) return;

  const tr = view.state.tr.setMeta(searchPluginKey, DecorationSet.empty);
  view.dispatch(tr);
}

/**
 * Focuses / scrolls to the active match smoothly in the editor.
 */
export function scrollToMatch(view: EditorView, match: SearchMatch) {
  try {
    const tr = view.state.tr.setSelection(
      TextSelection.create(view.state.doc, match.from, match.to)
    );
    view.dispatch(tr);
  } catch {}

  // Scroll the active match element into view with smooth centering
  setTimeout(() => {
    const activeEl = view.dom.querySelector('.bn-search-match-active');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 16);
}

/**
 * Replaces a single match and advances selection.
 */
export function replaceMatch(
  view: EditorView,
  match: SearchMatch,
  replacement: string
) {
  const tr = view.state.tr.insertText(replacement, match.from, match.to);
  const newPos = match.from + replacement.length;
  tr.setSelection(TextSelection.create(tr.doc, newPos, newPos));
  tr.scrollIntoView();
  view.dispatch(tr);
}

/**
 * Replaces all matches in reverse position order in an atomic ProseMirror transaction.
 */
export function replaceAllMatches(
  view: EditorView,
  matches: SearchMatch[],
  replacement: string
): number {
  if (matches.length === 0) return 0;
  // Sort descending by position to prevent position offsets
  const sorted = [...matches].sort((a, b) => b.from - a.from);
  let tr = view.state.tr;
  for (const m of sorted) {
    tr = tr.insertText(replacement, m.from, m.to);
  }
  tr.scrollIntoView();
  view.dispatch(tr);
  return sorted.length;
}
