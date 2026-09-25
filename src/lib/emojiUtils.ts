import { EMOJI_LIST } from './constants';

const KEYWORD_MAP: Array<{ keywords: string[]; emoji: string }> = [
  // Folders & Collections
  { keywords: ['folder', 'directory', 'collection', 'archive', 'binder', 'categories', 'category'], emoji: '📁' },
  
  // Projects & Operations
  { keywords: ['project', 'launch', 'release', 'sprint', 'ship', 'roadmap', 'milestone', 'epic', 'initiative'], emoji: '🚀' },
  { keywords: ['target', 'goal', 'goals', 'okr', 'okrs', 'kpi', 'kpis', 'objective', 'aim'], emoji: '🎯' },
  { keywords: ['task', 'tasks', 'todo', 'todos', 'checklist', 'backlog', 'kanban', 'board'], emoji: '📋' },
  { keywords: ['done', 'complete', 'completed', 'finished'], emoji: '✅' },
  
  // Design & Creative
  { keywords: ['design', 'ui', 'ux', 'figma', 'mockup', 'wireframe', 'prototype', 'style', 'brand', 'art', 'palette', 'sketch', 'vector', 'logo', 'creative', 'illustration'], emoji: '🎨' },
  { keywords: ['photo', 'photos', 'image', 'images', 'picture', 'camera', 'gallery', 'snapshot'], emoji: '📷' },
  { keywords: ['video', 'movie', 'film', 'youtube', 'recording', 'media', 'cinema'], emoji: '🎬' },
  
  // Dev, Tech & Engineering
  { keywords: ['code', 'coder', 'coding', 'dev', 'development', 'developer', 'engineering', 'tech', 'architecture', 'frontend', 'backend', 'fullstack', 'api', 'apis', 'sdk', 'git', 'github', 'repo', 'database', 'db', 'sql', 'schema', 'server', 'node', 'react', 'ts', 'typescript', 'js', 'javascript', 'python', 'go', 'rust', 'html', 'css', 'web'], emoji: '💻' },
  { keywords: ['bug', 'bugs', 'issue', 'issues', 'fix', 'debug', 'error', 'log', 'logs', 'crash'], emoji: '🐛' },
  { keywords: ['tool', 'tools', 'utility', 'setup', 'config', 'configuration', 'settings', 'options', 'env', 'environment'], emoji: '🛠️' },
  { keywords: ['ai', 'ml', 'bot', 'gpt', 'llm', 'prompt', 'agent', 'robot', 'automation'], emoji: '🤖' },
  { keywords: ['test', 'tests', 'testing', 'qa', 'experiment', 'lab', 'research', 'science', 'spec', 'specs'], emoji: '🧪' },

  // Business, Finance & Sales
  { keywords: ['work', 'job', 'career', 'business', 'company', 'corp', 'office'], emoji: '💼' },
  { keywords: ['finance', 'financial', 'budget', 'money', 'cost', 'costs', 'expense', 'expenses', 'revenue', 'sales', 'invoice', 'billing', 'pricing', 'tax', 'taxes', 'payroll', 'accounting', 'usd', 'dollar', 'bank'], emoji: '📊' },
  { keywords: ['analytics', 'metrics', 'stats', 'statistics', 'chart', 'graph', 'report', 'dashboard', 'performance', 'growth', 'trend'], emoji: '📊' },
  { keywords: ['shop', 'shopping', 'store', 'cart', 'order', 'orders', 'ecommerce', 'package'], emoji: '📦' },
  { keywords: ['client', 'customer', 'crm', 'lead', 'leads', 'contacts', 'people', 'team', 'user', 'users', 'directory'], emoji: '📇' },

  // Communication & Meetings
  { keywords: ['meeting', 'meetings', 'standup', 'sync', 'huddle', 'call', 'notes', 'agenda', 'minutes', 'discussion'], emoji: '🗓️' },
  { keywords: ['calendar', 'schedule', 'event', 'events', 'date', 'plan', 'planner', 'timeline'], emoji: '📅' },
  { keywords: ['chat', 'comment', 'comments', 'feedback', 'slack', 'message', 'conversation'], emoji: '💬' },
  { keywords: ['email', 'mail', 'newsletter', 'letter', 'inbox', 'outbox'], emoji: '📧' },

  // Documentation & Knowledge
  { keywords: ['book', 'books', 'reading', 'library', 'learn', 'learning', 'study', 'knowledge', 'wiki', 'documentation', 'docs', 'guide', 'manual', 'handbook', 'resource', 'resources'], emoji: '📚' },
  { keywords: ['article', 'news', 'newspaper', 'blog', 'post', 'press', 'journal', 'paper'], emoji: '🗞️' },
  { keywords: ['idea', 'ideas', 'brainstorm', 'thoughts', 'mindmap', 'concept', 'lightbulb'], emoji: '💡' },
  { keywords: ['summary', 'brief', 'overview', 'proposal', 'draft', 'memo', 'note', 'notes'], emoji: '📝' },

  // Personal, Health, Entertainment & Lifestyle
  { keywords: ['recipe', 'recipes', 'food', 'meal', 'meals', 'cooking', 'kitchen', 'dinner', 'lunch', 'breakfast', 'pizza', 'restaurant'], emoji: '🍕' },
  { keywords: ['coffee', 'tea', 'cafe', 'espresso', 'boba', 'drink'], emoji: '☕' },
  { keywords: ['travel', 'trip', 'vacation', 'flight', 'hotel', 'itinerary', 'passport', 'tour', 'airplane', 'plane'], emoji: '✈️' },
  { keywords: ['fitness', 'gym', 'workout', 'exercise', 'health', 'diet', 'sport', 'sports', 'running'], emoji: '🏋️' },
  { keywords: ['music', 'song', 'songs', 'audio', 'podcast', 'playlist', 'track', 'sound'], emoji: '🎵' },
  { keywords: ['game', 'games', 'gaming', 'play', 'arcade', 'steam', 'controller'], emoji: '🎮' },
  { keywords: ['home', 'house', 'family', 'personal', 'me', 'life'], emoji: '🏠' },
  { keywords: ['security', 'password', 'passwords', 'secret', 'key', 'keys', 'vault', 'lock', 'privacy'], emoji: '🔑' },
  { keywords: ['fav', 'favorite', 'favorites', 'starred', 'bookmark', 'bookmarks'], emoji: '⭐' },
  { keywords: ['gift', 'present', 'reward', 'offer', 'bonus'], emoji: '🎁' },
];

/**
 * Automatically infers an appropriate emoji based on the title of a page or folder.
 */
export function inferEmojiFromTitle(title: string, options?: { isFolder?: boolean }): string {
  const fallback = options?.isFolder ? '📁' : '📄';
  if (!title || typeof title !== 'string') return fallback;

  const cleanTitle = title.trim().toLowerCase();
  if (!cleanTitle) return fallback;

  // Ignore generic default names
  const genericNames = ['untitled', 'untitled document', 'untitled page', 'untitled folder', 'new collection', 'new folder', 'folder'];
  if (genericNames.includes(cleanTitle)) {
    return fallback;
  }

  // Split title into words
  const tokens = cleanTitle.split(/[^a-z0-9]+/i).filter(Boolean);
  if (tokens.length === 0) return fallback;

  // 1. High-precision KEYWORD_MAP lookup
  for (const token of tokens) {
    for (const entry of KEYWORD_MAP) {
      if (entry.keywords.includes(token)) {
        return entry.emoji;
      }
    }
  }

  // Multi-word phrase matching
  for (const entry of KEYWORD_MAP) {
    for (const kw of entry.keywords) {
      if (kw.includes(' ') && cleanTitle.includes(kw)) {
        return entry.emoji;
      }
    }
  }

  // 2. Score match against EMOJI_LIST
  let bestEmoji: string | null = null;
  let maxScore = 0;

  for (const item of EMOJI_LIST) {
    const itemKeywords = `${item.name} ${item.keywords}`.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);
    let score = 0;

    for (const token of tokens) {
      if (token.length < 3 && token !== 'ai' && token !== 'ui' && token !== 'db' && token !== 'qa') continue;

      for (const kw of itemKeywords) {
        if (kw === token) {
          score += 10;
        } else if (kw.startsWith(token) || token.startsWith(kw)) {
          score += 5;
        } else if (kw.includes(token) && token.length >= 4) {
          score += 2;
        }
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestEmoji = item.emoji;
    }
  }

  if (bestEmoji && maxScore >= 5) {
    return bestEmoji;
  }

  return fallback;
}

/**
 * Checks if an icon is un-customized (i.e. default or auto-inferred from title).
 */
export function isDefaultOrInferredIcon(
  icon: string | null | undefined,
  title: string,
  options?: { isFolder?: boolean }
): boolean {
  if (!icon || icon === '📄' || icon === '📁' || icon === '📂') return true;
  const inferred = inferEmojiFromTitle(title, options);
  return icon === inferred;
}
