import Redis from 'ioredis';

// Initialize Redis client with graceful error handling and retry strategy
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let redisInstance: Redis | null = null;
let isRedisAvailable = true;

export function getRedisClient(): Redis | null {
  if (redisInstance) {
    return redisInstance;
  }

  try {
    redisInstance = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      retryStrategy(times) {
        if (times > 3) {
          isRedisAvailable = false;
          return null; // Stop retrying after 3 failed attempts
        }
        return Math.min(times * 200, 1000);
      },
      reconnectOnError(err) {
        console.warn('[Redis] Reconnect on error:', err.message);
        return true;
      },
      lazyConnect: false,
    });

    redisInstance.on('connect', () => {
      isRedisAvailable = true;
    });

    redisInstance.on('error', (err) => {
      console.warn('[Redis] Connection warning (falling back to direct DB):', err.message);
      isRedisAvailable = false;
    });

    return redisInstance;
  } catch (err: any) {
    console.warn('[Redis] Failed to initialize Redis client:', err.message);
    isRedisAvailable = false;
    return null;
  }
}

// Global cache key generators
export const redisKeys = {
  session: (token: string, wsId?: string) => `session:${token}:${wsId || 'default'}`,
  workspaceTree: (wsId: string) => `ws:tree:${wsId}`,
  workspaceDatabases: (wsId: string) => `ws:dbs:${wsId}`,
  database: (dbId: string) => `db:${dbId}`,
  page: (pageId: string) => `page:${pageId}`,
  publicPage: (pageId: string) => `public:page:${pageId}`,
  workspaceSearch: (wsId: string, query: string) => `search:${wsId}:${encodeURIComponent(query.toLowerCase().trim())}`,
  pagePresence: (pageId: string) => `presence:page:${pageId}`,
  rateLimit: (action: string, id: string) => `ratelimit:${action}:${id}`,
};

/**
 * Fetch cached JSON value from Redis
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client || !isRedisAvailable) return null;

  try {
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Set cached JSON value in Redis with optional TTL in seconds
 */
export async function setCache<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
  const client = getRedisClient();
  if (!client || !isRedisAvailable) return;

  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds > 0) {
      await client.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await client.set(key, serialized);
    }
  } catch (err) {
    console.warn(`[Redis] Failed to set key ${key}:`, err);
  }
}

/**
 * Delete one or more specific cache keys
 */
export async function deleteCache(keys: string | string[]): Promise<void> {
  const client = getRedisClient();
  if (!client || !isRedisAvailable) return;

  try {
    const keyList = Array.isArray(keys) ? keys.filter(Boolean) : [keys];
    if (keyList.length > 0) {
      await client.del(...keyList);
    }
  } catch (err) {
    console.warn('[Redis] Failed to delete keys:', err);
  }
}

/**
 * Delete keys matching a wild-card pattern (e.g. `search:workspace123:*`)
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  const client = getRedisClient();
  if (!client || !isRedisAvailable) return;

  try {
    const stream = client.scanStream({
      match: pattern,
      count: 100,
    });

    const keysToDelete: string[] = [];
    stream.on('data', (keys: string[]) => {
      if (keys.length > 0) {
        keysToDelete.push(...keys);
      }
    });

    await new Promise<void>((resolve) => {
      stream.on('end', async () => {
        if (keysToDelete.length > 0) {
          try {
            await client.del(...keysToDelete);
          } catch { }
        }
        resolve();
      });
      stream.on('error', () => resolve());
    });
  } catch (err) {
    console.warn(`[Redis] Failed to scan pattern ${pattern}:`, err);
  }
}

/**
 * Sliding window / counter-based rate limiter
 */
export async function checkRateLimit(
  action: string,
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetSeconds: number }> {
  const client = getRedisClient();
  if (!client || !isRedisAvailable) {
    // If Redis is down, allow the request to prevent blocking legitimate users
    return { allowed: true, remaining: limit, resetSeconds: windowSeconds };
  }

  try {
    const key = redisKeys.rateLimit(action, identifier);
    const count = await client.incr(key);

    if (count === 1) {
      await client.expire(key, windowSeconds);
    }

    const ttl = await client.ttl(key);
    const resetSeconds = ttl > 0 ? ttl : windowSeconds;

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetSeconds,
    };
  } catch {
    return { allowed: true, remaining: limit, resetSeconds: windowSeconds };
  }
}
