import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

// Snapshots daily readiness for every active user. Powers the trend sparkline
// and the velocity calculation (slope over last 14 snapshots).
// Idempotent per (user_id, snapshot_date) thanks to ON CONFLICT.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env['CRON_SECRET']}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const startedAt = Date.now()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc('snapshot_readiness_batch' as any)

  if (error) {
    logger.error({ err: error }, 'snapshot_readiness_batch failed')
    return NextResponse.json({ error: 'Snapshot failed' }, { status: 500 })
  }

  const result = {
    snapshotted: typeof data === 'number' ? data : 0,
    durationMs: Date.now() - startedAt,
  }

  logger.info(result, 'Readiness snapshot cron completed')
  return NextResponse.json(result)
}

export async function GET(req: NextRequest) {
  return POST(req)
}
