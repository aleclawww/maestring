import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'

// Public uptime/liveness probe. Lets external monitors (BetterUptime,
// UptimeRobot, Vercel monitoring) distinguish "Next.js is up but Supabase
// is unreachable" from "everything's fine". This route is listed in
// middleware PUBLIC_PREFIXES so it never 307s to /login.
//
// Status semantics:
//   ok        — every upstream healthy
//   degraded  — soft failure on a non-critical path (unused for now; reserved)
//   down      — a critical upstream failed
//
// HTTP: 200 for ok/degraded (monitor still reads JSON body), 503 for down.
// Never caches: we want fresh reads on every probe.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

type CheckStatus = 'ok' | 'degraded' | 'down'

interface Check {
  status: CheckStatus
  latencyMs: number
  error?: string
}

interface HealthResponse {
  status: CheckStatus
  uptime: number
  timestamp: string
  version: string | null
  checks: {
    supabase: Check
    redis: Check
  }
}

const UPSTREAM_TIMEOUT_MS = 3_000

async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<Check> {
  const start = Date.now()
  try {
    await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
          timeoutMs,
        ),
      ),
    ])
    return { status: 'ok', latencyMs: Date.now() - start }
  } catch (err) {
    return {
      status: 'down',
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

async function checkSupabase(): Promise<Check> {
  return withTimeout(
    async () => {
      const admin = createAdminClient()
      // head:true + count skips row fetch — minimal work on the DB side.
      const { error } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .limit(1)
      if (error) throw error
    },
    UPSTREAM_TIMEOUT_MS,
    'supabase',
  )
}

async function checkRedis(): Promise<Check> {
  return withTimeout(
    async () => {
      const pong = await redis.ping()
      if (pong !== 'PONG') {
        throw new Error(`unexpected ping response: ${String(pong)}`)
      }
    },
    UPSTREAM_TIMEOUT_MS,
    'redis',
  )
}

export async function GET() {
  const [supabase, redisCheck] = await Promise.all([
    checkSupabase(),
    checkRedis(),
  ])

  const statuses: CheckStatus[] = [supabase.status, redisCheck.status]
  const overall: CheckStatus = statuses.includes('down')
    ? 'down'
    : statuses.includes('degraded')
      ? 'degraded'
      : 'ok'

  const body: HealthResponse = {
    status: overall,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env['VERCEL_GIT_COMMIT_SHA']?.slice(0, 7) ?? null,
    checks: { supabase, redis: redisCheck },
  }

  if (overall !== 'ok') {
    logger.warn({ checks: body.checks }, 'health check degraded/down')
  }

  const httpStatus = overall === 'down' ? 503 : 200

  return NextResponse.json(body, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}

// HEAD probe for monitors that only want a status code (no body).
export async function HEAD() {
  const [supabase, redisCheck] = await Promise.all([
    checkSupabase(),
    checkRedis(),
  ])
  const down =
    supabase.status === 'down' || redisCheck.status === 'down'
  return new NextResponse(null, {
    status: down ? 503 : 200,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}
