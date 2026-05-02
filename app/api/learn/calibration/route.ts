export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

const Schema = z.object({
  workingMemorySpan: z.number().int().min(2).max(9),
  processingSpeedMs: z.number().int().min(100).max(10000),
  chronotype: z.enum(['morning', 'evening', 'neutral']),
  sleepStartHour: z.number().int().min(0).max(23),
  sleepEndHour: z.number().int().min(0).max(23),
  cognitiveLoadBudget: z.number().int().min(1).max(5),
})

export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser()
  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', details: parsed.error.format() }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 1) Read existing fingerprint, merge, write back.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase
    .from('profiles')
    .select('cognitive_fingerprint' as any) as any)
    .eq('id', user.id)
    .maybeSingle()
  const existing = (profile?.cognitive_fingerprint ?? {}) as Record<string, unknown>

  const merged = {
    ...existing,
    working_memory_span: parsed.data.workingMemorySpan,
    processing_speed_ms: parsed.data.processingSpeedMs,
    chronotype: parsed.data.chronotype,
    sleep_window_start_hour: parsed.data.sleepStartHour,
    sleep_window_end_hour: parsed.data.sleepEndHour,
    cognitive_load_budget: parsed.data.cognitiveLoadBudget,
    v2_initialized_at: new Date().toISOString(),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: upErr } = await (supabase.from('profiles') as any)
    .update({ cognitive_fingerprint: merged })
    .eq('id', user.id)
  if (upErr) {
    logger.error({ err: upErr, userId: user.id }, 'calibration: profile update failed')
    return NextResponse.json({ error: 'profile_update_failed' }, { status: 500 })
  }

  // 2) Make sure user_learning_state exists. (Phase advances on next nextActivity() call.)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.rpc as any)('ensure_user_learning_state', { p_user_id: user.id })

  return NextResponse.json({ ok: true, fingerprint: merged })
}
