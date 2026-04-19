import { Ratelimit } from "@upstash/ratelimit";
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

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  reset: number;
};

const FAIL_OPEN: RateLimitResult = {
  allowed: true,
  remaining: 999,
  reset: Date.now() + 60_000,
};

// Limiters (lazy-initialized)
let llmLimiter: Ratelimit | null = null;
let generalLimiter: Ratelimit | null = null;
let uploadLimiter: Ratelimit | null = null;
let authLimiter: Ratelimit | null = null;

function getLlmLimiter(): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  if (!llmLimiter) {
    llmLimiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      prefix: "rl:llm",
    });
  }
  return llmLimiter;
}

function getGeneralLimiter(): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  if (!generalLimiter) {
    generalLimiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(100, "1 m"),
      prefix: "rl:general",
    });
  }
  return generalLimiter;
}

function getUploadLimiter(): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  if (!uploadLimiter) {
    uploadLimiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(10, "1 h"),
      prefix: "rl:upload",
    });
  }
  return uploadLimiter;
}

function getAuthLimiter(): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  if (!authLimiter) {
    authLimiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      prefix: "rl:auth",
    });
  }
  return authLimiter;
}

async function checkLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<RateLimitResult> {
  if (!limiter) return FAIL_OPEN;
  try {
    const result = await limiter.limit(identifier);
    return {
      allowed: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch {
    return FAIL_OPEN;
  }
}

export async function checkLlmRateLimit(userId: string): Promise<RateLimitResult> {
  return checkLimit(getLlmLimiter(), userId);
}

export async function checkGeneralRateLimit(identifier: string): Promise<RateLimitResult> {
  return checkLimit(getGeneralLimiter(), identifier);
}

export async function checkUploadRateLimit(userId: string): Promise<RateLimitResult> {
  return checkLimit(getUploadLimiter(), userId);
}

export async function checkAuthRateLimit(ip: string): Promise<RateLimitResult> {
  return checkLimit(getAuthLimiter(), ip);
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  };
}
