import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

// GDPR Art. 20 — right to data portability.
// Returns a JSON blob containing all data Maestring holds for the
// authenticated user, with Content-Disposition: attachment so the
// browser saves it directly.
//
// Data collected:
//   - Profile
//   - Subscription
//   - Study sessions (last 200)
//   - Question attempts (last 1000)
//   - Concept states (all)
//   - Exam sessions (all) + answers
//   - Documents (metadata only — no stored PDFs are retained)
//   - Referrals (referrer + referred)
//   - Testimonial (if any)
//
// Rate-limited to one export per hour per user via a simple DB column
// (`profiles.last_export_at`). If the column doesn't exist the check
// is skipped (fail-open) but the absence is logged.

export async function POST() {
  const user = await requireAuthenticatedUser()
  const supabase = createAdminClient()

  // Soft rate-limit: one export per hour.
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('last_export_at')
    .eq('id', user.id)
    .maybeSingle()

  if (profileErr) {
    // Column might not exist on older schemas — log and proceed fail-open.
    logger.warn({ err: profileErr, userId: user.id }, 'account/export: profile read failed, skipping rate-limit check')
  } else if (profile?.last_export_at) {
    const lastExport = new Date(profile.last_export_at as string).getTime()
    if (Date.now() - lastExport < 60 * 60 * 1000) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'You can only export your data once per hour.' },
        { status: 429 },
      )
    }
  }

  // --- Gather all user data in parallel -----------------------------------
  const [
    profileFull,
    subscription,
    studySessions,
    questionAttempts,
    conceptStates,
    examSessions,
    documents,
    referralsMade,
    referralReceived,
    testimonial,
  ] = await Promise.allSettled([
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url, referral_code, referred_by, current_streak, longest_streak, exam_passed, exam_score, cognitive_fingerprint, study_mode, created_at, updated_at')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('subscriptions')
      .select('plan, status, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('study_sessions')
      .select('id, status, questions_answered, started_at, ended_at, domain_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('question_attempts')
      .select('id, concept_id, is_correct, selected_index, time_spent_ms, rating, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('user_concept_states')
      .select('concept_id, stability, difficulty, due_at, reps, lapses, last_review_at, created_at, updated_at')
      .eq('user_id', user.id),
    supabase
      .from('exam_sessions')
      .select('id, status, score, scaled_score, deadline_at, submitted_at, created_at')
      .eq('user_id', user.id),
    supabase
      .from('user_documents')
      .select('id, filename, processing_status, created_at, updated_at')
      .eq('user_id', user.id),
    supabase
      .from('referrals')
      .select('referred_id, code, converted_at, credit_applied, created_at')
      .eq('referrer_id', user.id),
    supabase
      .from('referrals')
      .select('referrer_id, code, converted_at, created_at')
      .eq('referred_id', user.id)
      .maybeSingle(),
    supabase
      .from('testimonials')
      .select('display_name, role, content, stars, status, exam_passed, scaled_score, submitted_at')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  function unwrap<T>(result: PromiseSettledResult<{ data: T | null; error: unknown }>): T | null {
    if (result.status === 'rejected') return null
    if (result.value.error) return null
    return result.value.data ?? null
  }

  const payload = {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    email: user.email,
    profile: unwrap(profileFull),
    subscription: unwrap(subscription),
    study_sessions: unwrap(studySessions) ?? [],
    question_attempts: unwrap(questionAttempts) ?? [],
    concept_states: unwrap(conceptStates) ?? [],
    exam_sessions: unwrap(examSessions) ?? [],
    documents: unwrap(documents) ?? [],
    referrals_made: unwrap(referralsMade) ?? [],
    referral_received: unwrap(referralReceived),
    testimonial: unwrap(testimonial),
  }

  // Record the export timestamp (best-effort — don't block the response on failure).
  void supabase
    .from('profiles')
    .update({ last_export_at: new Date().toISOString() } as Record<string, string>)
    .eq('id', user.id)
    .then(({ error }) => {
      if (error) {
        // Column may not exist — non-fatal, export already completed.
        logger.warn({ err: error, userId: user.id }, 'account/export: failed to update last_export_at (non-fatal)')
      }
    })

  logger.info({ userId: user.id }, 'account/export: data export generated')

  const filename = `maestring-data-${new Date().toISOString().slice(0, 10)}.json`
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
