import { Redis } from "@upstash/redis";

// The bare Redis client. Used by /api/health for a direct PING probe.
//
// Application code should NOT import this directly — it does not fail-open
// and a dead Redis will throw synchronously on every operation. Use the
// wrappers in ./rate-limit.ts and ./cache.ts instead, which catch and
// notify via ./outage-alert.notifyRedisOutage.
//
// History: this module previously exported Ratelimit instances and a
// getCache/setCache helper set, but nothing imported them — the real
// fail-open helpers live in the sibling files above. The dead exports were
// removed to stop future callers from picking the wrong module.
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
