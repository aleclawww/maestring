import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  if (
    process.env["UPSTASH_REDIS_REST_URL"] &&
    process.env["UPSTASH_REDIS_REST_TOKEN"]
  ) {
    redis = new Redis({
      url: process.env["UPSTASH_REDIS_REST_URL"],
      token: process.env["UPSTASH_REDIS_REST_TOKEN"],
    });
  }
  return redis;
}

export async function cacheGetOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 300
): Promise<T> {
  const r = getRedis();
  if (!r) return fetcher();

  try {
    const cached = await r.get<T>(key);
    if (cached !== null) return cached;
    const fresh = await fetcher();
    await r.setex(key, ttlSeconds, JSON.stringify(fresh));
    return fresh;
  } catch {
    return fetcher();
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    return await r.get<T>(key);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // fail silently
  }
}

export async function cacheDelete(key: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(key);
  } catch {
    // fail silently
  }
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    let cursor = 0;
    do {
      const [nextCursor, keys] = await r.scan(cursor, { match: pattern, count: 100 });
      cursor = Number(nextCursor);
      if (keys.length > 0) {
        await r.del(...keys);
      }
    } while (cursor !== 0);
  } catch {
    // fail silently
  }
}
