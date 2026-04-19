import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const Background = z.enum(['developer', 'sysadmin', 'business', 'student', 'other'])

const Schema = z.object({
  certificationId: z.string().default('aws-saa-c03'),
  examTargetDate: z.string().nullable(),
  studyMinutesPerDay: z.number().int().min(5).max(240),
  background: Background,
  selfLevels: z.record(z.string(), z.number().int().min(0).max(4)),
})

function derivePace(examTargetDate: string | null): 'sprint' | 'cruise' | 'unknown' {
  if (!examTargetDate) return 'unknown'
  const days = Math.ceil((new Date(examTargetDate).getTime() - Date.now()) / 86_400_000)
  if (days <= 21) return 'sprint'
  if (days >= 42) return 'cruise'
  return 'cruise'
}

function deriveExplanationDepth(background: z.infer<typeof Background>) {
  return background === 'developer' || background === 'sysadmin' ? 'concise' : 'deep'
}

export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser()
  const body = await req.json().catch(() => ({}))
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.format() }, { status: 400 })
  }

  const { certificationId, examTargetDate, studyMinutesPerDay, background, selfLevels } = parsed.data
  const supabase = createAdminClient()

  const fingerprint = {
    background,
    self_level_by_domain: selfLevels,
    study_pace: derivePace(examTargetDate),
    explanation_depth: deriveExplanationDepth(background),
    avg_session_length_min: studyMinutesPerDay,
    calibrated_at: new Date().toISOString(),
  }

  const { error: profileErr } = await supabase
    .from('profiles')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({
      onboarding_completed: true,
      exam_target_date: examTargetDate,
      study_minutes_per_day: studyMinutesPerDay,
      cognitive_fingerprint: fingerprint,
    } as any)
    .eq('id', user.id)

  if (profileErr) {
    logger.error({ err: profileErr, userId: user.id }, 'Failed to update profile during calibration')
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: seedErr } = await supabase.rpc('seed_concept_states_from_self_rating' as any, {
    p_user_id: user.id,
    p_certification_id: certificationId,
    p_self_levels: selfLevels,
    p_concepts_per_domain: 5,
  })

  if (seedErr) {
    logger.error({ err: seedErr, userId: user.id }, 'Failed to seed concept states')
    // Profile is updated; user can still proceed — concepts will be seeded on
    // first study session via ensureConceptStatesExist. Non-blocking.
  }

  // Mirror onboarding flag into auth user_metadata so middleware doesn't need a
  // DB roundtrip on every request.
  await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...(user.user_metadata ?? {}),
      onboarding_completed: true,
    },
  })

  logger.info({ userId: user.id, background, pace: fingerprint.study_pace }, 'Onboarding calibrated')

  return NextResponse.json({ data: { success: true, fingerprint } })
}
