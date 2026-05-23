export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

// POST /api/elaborations
//
// Persists one elaboration attempt — the user's own written explanation
// for a question they answered correctly, plus which key-points they
// self-assessed as covered. Append-only (no PUT / PATCH / DELETE here;
// the table itself has no UPDATE/DELETE RLS policies).
//
// No rate limit by design (per P3 decision): this is an opt-in feature
// with no XP/badge reward, so spam has no incentive. The auto-friction of
// writing meaningful text already filters abuse. If we ever see junk
// rows in elaboration_attempts, layer in checkAuthRateLimit then.

const ElaborationSchema = z.object({
  // The user opted in from the post-correct branch of a SPECIFIC question,
  // so question_id / concept_id / session_id are all known at submit time.
  // We require all three to keep elaboration_attempts joinable to the rest
  // of the session graph for the % metric and future analytics.
  questionId: z.string().uuid(),
  conceptId: z.string().uuid(),
  sessionId: z.string().uuid(),

  // The user's own explanation. We mirror the DB CHECK (1-4000 chars after
  // trim) so the 400 error message is clean instead of a CHECK violation.
  userExplanation: z.string().trim().min(1).max(4000),

  // Indices of key_points (in the model elaboration) that the user marked
  // as "I covered this" during self-assessment. We accept any int[]; the
  // DB only enforces array shape — values are validated only loosely (we
  // don't refuse e.g. [99] because key_points length is dynamic and
  // checking it here would require a second DB lookup).
  coveredPointIndices: z.array(z.number().int().nonnegative()).max(20).default([]),

  // Did the user write anything in response to the optional metacognitive
  // prompt? Boolean only — we don't persist the response text in v1 (see
  // migration 052 comment for the rationale and the upgrade path).
  metacognitiveResponded: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser()

  const body = await req.json().catch(() => ({}))
  const parsed = ElaborationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_request', details: parsed.error.format() },
      { status: 400 },
    )
  }

  const {
    questionId,
    conceptId,
    sessionId,
    userExplanation,
    coveredPointIndices,
    metacognitiveResponded,
  } = parsed.data

  const supabase = createAdminClient()

  // Verify the session genuinely belongs to this user. RLS on
  // elaboration_attempts already enforces user_id = auth.uid() at insert
  // (via the policy in migration 052), but session_id is a foreign key
  // with no such guard — a malicious client could submit a session_id
  // that belongs to another user. Cheap pre-check makes the 403 explicit.
  const { data: session, error: sessErr } = await supabase
    .from('study_sessions')
    .select('id, user_id')
    .eq('id', sessionId)
    .maybeSingle()
  if (sessErr) {
    logger.error(
      { err: sessErr, userId: user.id, sessionId },
      'elaboration: session lookup failed',
    )
    return NextResponse.json({ error: 'session_lookup_failed' }, { status: 500 })
  }
  if (!session) {
    return NextResponse.json({ error: 'session_not_found' }, { status: 404 })
  }
  if (session.user_id !== user.id) {
    logger.warn(
      { userId: user.id, sessionId, sessionOwner: session.user_id },
      'elaboration: session_id does not belong to caller — rejecting',
    )
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Cast `from()` to bypass the generated-types union — the
  // elaboration_attempts table is new in migration 052 and
  // types/supabase-generated.ts won't include it until
  // `npm run db:types` is re-run post-migration. Once that happens,
  // the cast can be removed and `Insert<'elaboration_attempts'>` from
  // @/types/database used instead.
  const insertPayload = {
    session_id: sessionId,
    question_id: questionId,
    concept_id: conceptId,
    user_id: user.id,
    user_explanation: userExplanation,
    covered_point_indices: coveredPointIndices,
    metacognitive_responded: metacognitiveResponded,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error: insErr } = await (supabase
    .from('elaboration_attempts' as any) as any)
    .insert(insertPayload)
    .select('id, created_at')
    .single()

  if (insErr) {
    logger.error(
      { err: insErr, userId: user.id, questionId, conceptId, sessionId },
      'elaboration: insert failed',
    )
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  return NextResponse.json(
    {
      ok: true,
      id: inserted.id,
      createdAt: inserted.created_at,
    },
    { status: 201 },
  )
}
