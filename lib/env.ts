/**
 * Centralized environment variable validation.
 *
 * All required server-side vars are asserted here so misconfigured deployments
 * fail fast with a clear, actionable message instead of a cryptic runtime error
 * deep in a route handler (e.g. "Cannot read property 'id' of undefined" from
 * a Supabase client that couldn't even initialise).
 *
 * Usage: import specific vars from this module, or call validateEnv() from
 * instrumentation.ts to eagerly validate at startup.
 *
 * DO NOT import this file in client-side code (components, `'use client'`
 * modules). It references `process.env` server vars that are not bundled for
 * the browser and will cause build errors if included.
 */

function required(name: string): string {
  const val = process.env[name]
  if (!val) {
    throw new Error(
      `[env] Required environment variable "${name}" is missing or empty.\n` +
      `  → Copy .env.example to .env.local and fill in the value.`
    )
  }
  return val
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined
}

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------
export const NEXT_PUBLIC_SUPABASE_URL = required('NEXT_PUBLIC_SUPABASE_URL')
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = required('NEXT_PUBLIC_SUPABASE_ANON_KEY')
export const SUPABASE_SERVICE_ROLE_KEY = required('SUPABASE_SERVICE_ROLE_KEY')

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export const NEXT_PUBLIC_APP_URL = required('NEXT_PUBLIC_APP_URL')

// ---------------------------------------------------------------------------
// AI providers
// ---------------------------------------------------------------------------
export const ANTHROPIC_API_KEY = required('ANTHROPIC_API_KEY')
export const OPENAI_API_KEY = required('OPENAI_API_KEY')

// ---------------------------------------------------------------------------
// Stripe
// ---------------------------------------------------------------------------
export const STRIPE_SECRET_KEY = required('STRIPE_SECRET_KEY')
export const STRIPE_WEBHOOK_SECRET = required('STRIPE_WEBHOOK_SECRET')

// ---------------------------------------------------------------------------
// Email (Resend)
// ---------------------------------------------------------------------------
export const RESEND_API_KEY = required('RESEND_API_KEY')
export const EMAIL_FROM = required('EMAIL_FROM')

// ---------------------------------------------------------------------------
// Auth / security
// ---------------------------------------------------------------------------
export const CRON_SECRET = required('CRON_SECRET')
export const MAGIC_LINK_SECRET = required('MAGIC_LINK_SECRET')

// ---------------------------------------------------------------------------
// Optional — fail-open services (absence degrades but doesn't break the app)
// ---------------------------------------------------------------------------
export const UPSTASH_REDIS_REST_URL = optional('UPSTASH_REDIS_REST_URL')
export const UPSTASH_REDIS_REST_TOKEN = optional('UPSTASH_REDIS_REST_TOKEN')
export const SENTRY_DSN = optional('SENTRY_DSN')
export const ADMIN_EMAILS = optional('ADMIN_EMAILS') ?? ''

// ---------------------------------------------------------------------------
// Validate all required vars upfront.
// Call this once at startup (instrumentation.ts) to surface missing vars
// immediately on deploy rather than on the first request that needs them.
// ---------------------------------------------------------------------------
export function validateEnv(): void {
  // Accessing these module-level constants is enough — the `required()` calls
  // above already throw if any are missing. This function exists to give
  // callers a named hook they can call explicitly (e.g. in instrumentation.ts)
  // that makes intent clear in code review.
  void [
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_APP_URL,
    ANTHROPIC_API_KEY,
    OPENAI_API_KEY,
    STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET,
    RESEND_API_KEY,
    EMAIL_FROM,
    CRON_SECRET,
    MAGIC_LINK_SECRET,
  ]
}
