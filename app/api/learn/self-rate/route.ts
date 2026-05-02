export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

const Schema = z.object({
  conceptSlug: z.string().min(1),
  rating: z.enum(['know', 'need_to_learn']),
})

/**
 * User-driven self-rating on a concept. Two outcomes:
 *
 *  - "know": fast-tracks the concept into Review with a stability of 14 days
 *    (FSRS will adjust further from the next real attempt). Pushes the next
 *    review out so the concept doesn't dominate the queue.
 *
 *  - "need_to_learn": forces an immediate review (next_review_date = now),
 *    drops stability to 0 and difficulty to 0.9 — the concept jumps to the
 *    front of the next session's queue.
 *
 * Idempotent and overrideable: the user can re-rate at any time.
 */
export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser()
  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', details: parsed.error.format() }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Resolve concept_id from slug.
  const { data: concept, error: cErr } = await supabase
    .from('concepts')
    .select('id')
    .eq('slug', parsed.data.conceptSlug)
    .maybeSingle()
  if (cErr || !concept) {
    return NextResponse.json({ error: 'concept_not_found' }, { status: 404 })
  }
  const conceptId = (concept as { id: string }).id

  const updates =
    parsed.data.rating === 'know'
      ? {
          stability: 14, difficulty: 0.3, state: 2 /* Review */,
          reps: 1, lapses: 0, elapsed_days: 0, scheduled_days: 14,
          next_review_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }
      : {
          stability: 0, difficulty: 0.9, state: 0 /* New */,
          reps: 0, lapses: 0, elapsed_days: 0, scheduled_days: 0,
          next_review_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

  // Upsert: row may not exist yet for a brand-new concept.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('user_concept_states') as any).upsert(
    { user_id: user.id, concept_id: conceptId, ...updates },
    { onConflict: 'user_id,concept_id' }
  )
  if (error) {
    logger.error({ err: error, userId: user.id, conceptId }, 'self-rate: upsert failed')
    return NextResponse.json({ error: 'upsert_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, rating: parsed.data.rating, conceptId })
}
