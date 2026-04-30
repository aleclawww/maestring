import { Redis } from "@upstash/redis";

// The bare Redis client. Used by /api/health for a direct PING probe.
//
// Application code should NOT import this directly — it does not fail-open
// and a dead Redis will throw synchronously on every operation. Use the
// wrappers in ./rate-limit.ts and ./cache.ts instead, which catch and
// notify via ./outage-alert.notifyRedisOutage.
//
// Exported as `Redis | null`: if UPSTASH env vars are not set the module
// still loads cleanly (important during builds and in local dev without
// Redis). Callers must handle the null case — the health check already does.

const _url = process.env["UPSTASH_REDIS_REST_URL"];
const _token = process.env["UPSTASH_REDIS_REST_TOKEN"];

if (!_url || !_token) {
  console.warn(
    "[redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set — Redis client unavailable"
  );
}

export const redis: Redis | null =
  _url && _token ? new Redis({ url: _url, token: _token }) : null;
