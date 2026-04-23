import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'

// Public uptime/liveness probe. Lets external monitors (BetterUptime,
// UptimeRobot, Vercel monitoring) distinguish "Next.js is up but Supabase
// is unreachable" from "everything's fine". This route is listed in
// middleware PUBLIC_PREFIXES so it never 307s to /login.
//
// Per-check severity:
//   supabase — critical. If it's down, the app is effectively down.
//   redis    — non-critical. Rate limiting (lib/redis/rate-limit) and cache
//              helpers fail-open by design, so a Redis outage degrades
//              (no rate caps, no caching) but doesn't break user flows.
//              A Redis-only failure reports `degraded` + HTTP 200 so uptime
//              monitors don't page on a non-user-facing issue. Operators
//              still see the detail in the JSON body.
//
// Overall status:
//   ok       — every check ok
//   degraded — only non-critical checks are down
//   down     — a critical check is down
//
// HTTP: 200 for ok/degraded, 503 for down. Never cached.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

type CheckStatus = 'ok' | 'degraded' | 'down'

interface Check {
  status: CheckStatus
  latencyMs: number
  critical: boolean
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

async function withTimeout(
  fn: () => Promise<void>,
  timeoutMs: number,
  label: string,
  critical: boolean,
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
    return { status: 'ok', latencyMs: Date.now() - start, critical }
  } catch (err) {
    return {
      status: critical ? 'down' : 'degraded',
      latencyMs: Date.now() - start,
      critical,
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
    /* critical */ true,
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
    /* critical */ false,
  )
}

function overallStatus(checks: Check[]): CheckStatus {
  const criticalDown = checks.some(c => c.critical && c.status === 'down')
  if (criticalDown) return 'down'
  const anyDegraded = checks.some(c => c.status !== 'ok')
  if (anyDegraded) return 'degraded'
  return 'ok'
}

export async function GET() {
  const [supabase, redisCheck] = await Promise.all([
    checkSupabase(),
    checkRedis(),
  ])

  const overall = overallStatus([supabase, redisCheck])

  const body: HealthResponse = {
    status: overall,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env['VERCEL_GIT_COMMIT_SHA']?.slice(0, 7) ?? null,
    checks: { supabase, redis: redisCheck },
  }

  if (overall !== 'ok') {
    logger.warn({ checks: body.checks }, `health check ${overall}`)
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
  const overall = overallStatus([supabase, redisCheck])
  return new NextResponse(null, {
    status: overall === 'down' ? 503 : 200,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}
