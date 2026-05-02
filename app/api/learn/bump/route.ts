export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const Schema = z.object({
  kind: z.enum(['ambient_exposure', 'anchoring_response']),
})

/**
 * Increments a single phase counter on user_learning_state. Used by activity
 * UIs that don't naturally write to question_attempts (ambient cards, anchoring
 * prompts). MCQ counters are bumped server-side from /api/study/evaluate.
 */
export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser()
  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 })

  const supabase = createAdminClient()
  // Make sure the row exists.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.rpc as any)('ensure_user_learning_state', { p_user_id: user.id })

  const col = parsed.data.kind === 'ambient_exposure' ? 'ambient_exposures' : 'anchoring_responses'

  // SQL-level increment to avoid the read-modify-write race.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)('increment_uls_counter', {
    p_user_id: user.id,
    p_column: col,
  })
  if (error) {
    // Fallback: read + write (best effort).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cur } = await (supabase.from('user_learning_state') as any)
      .select(col).eq('user_id', user.id).maybeSingle()
    const next = (cur?.[col] ?? 0) + 1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('user_learning_state') as any)
      .update({ [col]: next })
      .eq('user_id', user.id)
  }

  return NextResponse.json({ ok: true })
}
