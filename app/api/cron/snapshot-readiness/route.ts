import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runCron } from '@/lib/cron/run'

// Snapshots daily readiness for every active user. Powers the trend sparkline
// and the velocity calculation (slope over last 14 snapshots).
// Idempotent per (user_id, snapshot_date) thanks to ON CONFLICT.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env['CRON_SECRET']}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const outcome = await runCron('snapshot-readiness', async () => {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.rpc('snapshot_readiness_batch' as any)
    if (error) throw new Error(`snapshot_readiness_batch failed: ${error.message}`)

    const snapshotted = typeof data === 'number' ? data : 0
    return { status: 'ok' as const, rowsAffected: snapshotted, metadata: { snapshotted } }
  })

  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 500 })
  return NextResponse.json(outcome.result)
}

export async function GET(req: NextRequest) {
  return POST(req)
}
