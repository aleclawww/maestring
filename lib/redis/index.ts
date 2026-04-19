import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// ─── Cliente Redis ────────────────────────────────────────────────────────────

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ─── Rate Limiters ────────────────────────────────────────────────────────────

/**
 * Rate limiter general para APIs.
 * 60 requests por minuto por IP/usuario.
 */
export const rateLimitGeneral = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(
    parseInt(process.env.RATE_LIMIT_API_GENERAL ?? "60"),
    "1 m"
  ),
  analytics: true,
  prefix: "rl:general",
});

/**
 * Rate limiter para explicaciones de IA (costosas).
 * 10 requests por minuto por usuario.
 */
export const rateLimitAI = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(
    parseInt(process.env.RATE_LIMIT_AI_EXPLANATIONS ?? "10"),
    "1 m"
  ),
  analytics: true,
  prefix: "rl:ai",
});

/**
 * Rate limiter para subida de PDFs.
 * 5 uploads por hora por usuario.
 */
export const rateLimitPDF = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(
    parseInt(process.env.RATE_LIMIT_PDF_UPLOAD ?? "5"),
    "1 h"
  ),
  analytics: true,
  prefix: "rl:pdf",
});

/**
 * Rate limiter para operaciones de Stripe.
 * 20 requests por minuto.
 */
export const rateLimitStripe = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(
    parseInt(process.env.RATE_LIMIT_STRIPE ?? "20"),
    "1 m"
  ),
  analytics: true,
  prefix: "rl:stripe",
});

// ─── Helpers de caché ────────────────────────────────────────────────────────

export type CacheKey =
  | `user:${string}:progress`
  | `user:${string}:subscription`
  | `user:${string}:streak`
  | `questions:domain:${string}`
  | `questions:fsrs:${string}`
  | `session:${string}`
  | `leaderboard:weekly`
  | `leaderboard:monthly`;

/**
 * Obtener valor de caché con tipo.
 */
export async function getCache<T>(key: CacheKey): Promise<T | null> {
  const value = await redis.get<T>(key);
  return value;
}

/**
 * Guardar en caché con TTL.
 */
export async function setCache<T>(
  key: CacheKey,
  value: T,
  ttlSeconds: number
): Promise<void> {
  await redis.set(key, value, { ex: ttlSeconds });
}

/**
 * Invalidar caché.
 */
export async function invalidateCache(key: CacheKey): Promise<void> {
  await redis.del(key);
}

/**
 * Invalidar múltiples claves con patrón.
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

// TTL presets (en segundos)
export const CACHE_TTL = {
  SHORT: 60,           // 1 minuto
  MEDIUM: 300,         // 5 minutos
  LONG: 3600,          // 1 hora
  DAY: 86400,          // 24 horas
  WEEK: 604800,        // 7 días
} as const;
