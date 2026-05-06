export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkReportRateLimit, rateLimitHeaders } from '@/lib/redis/rate-limit'
import { logger } from '@/lib/logger'

const REPORT_CATEGORIES = [
  'wrong_answer',
  'multiple_correct',
  'unclear',
  'outdated',
  'other',
] as const

// Phase 1 decision D: `other` requires a non-empty comment. Mirrors the
// DB-level CHECK constraint in migration 050 so we surface a useful 400
// instead of letting Postgres reject with a constraint name.
const ReportSchema = z
  .object({
    questionId: z.string().uuid(),
    category: z.enum(REPORT_CATEGORIES),
    comment: z.string().max(2000).optional(),
    userSelectedOption: z.number().int().min(0).max(3).optional(),
  })
  .refine(
    (v) =>
      v.category !== 'other' ||
      (typeof v.comment === 'string' && v.comment.trim().length > 0),
    { message: "Comment is required when category is 'other'", path: ['comment'] },
  )

export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser()

  const rl = await checkReportRateLimit(user.id)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: rateLimitHeaders(rl) },
    )
  }

  const body = await req.json().catch(() => ({}))
  const parsed = ReportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_request', details: parsed.error.format() },
      { status: 400 },
    )
  }

  const { questionId, category, comment, userSelectedOption } = parsed.data
  const supabase = createAdminClient()

  // Confirm the question exists before inserting — the FK would catch this,
  // but a clean 404 is friendlier than a generic FK violation.
  const { data: question, error: qErr } = await supabase
    .from('questions')
    .select('id')
    .eq('id', questionId)
    .maybeSingle()

  if (qErr) {
    logger.error({ err: qErr, userId: user.id, questionId }, 'report: question lookup failed')
    return NextResponse.json({ error: 'question_lookup_failed' }, { status: 500 })
  }
  if (!question) {
    return NextResponse.json({ error: 'question_not_found' }, { status: 404 })
  }

  const insertPayload: Record<string, unknown> = {
    question_id: questionId,
    user_id: user.id,
    category,
  }
  if (typeof comment === 'string' && comment.trim().length > 0) {
    insertPayload['comment'] = comment.trim()
  }
  if (typeof userSelectedOption === 'number') {
    insertPayload['user_selected_option'] = userSelectedOption
  }

  // TODO: remove cast after types regen pre-merge — `question_reports` table
  // exists in migration 050 but `types/database.ts` is hand-written and only
  // gets the new shape after `npx supabase gen types typescript --local`.
  const { data: inserted, error: insErr } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('question_reports' as any)
    .insert(insertPayload)
    .select('id')
    .single()

  if (insErr) {
    logger.error(
      { err: insErr, userId: user.id, questionId, category },
      'report: insert failed',
    )
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  return NextResponse.json(
    { ok: true, id: (inserted as { id: string }).id },
    { headers: rateLimitHeaders(rl) },
  )
}
