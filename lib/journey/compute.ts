export type JourneyPhase =
  | 'pre_study'
  | 'active_prep'
  | 'pre_exam'
  | 'post_cert'
  | 'maintenance'

export interface ComputeJourneyPhaseInput {
  examTargetDate: Date | string | null
  sessionCount: number
  examOutcome: 'passed' | 'failed' | null
  now?: Date
}

function toUTCMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function daysBetween(a: Date, b: Date): number {
  const aUTC = toUTCMidnight(a)
  const bUTC = toUTCMidnight(b)
  return Math.round((aUTC.getTime() - bUTC.getTime()) / 86400000)
}

/**
 * Runtime port of the SQL `compute_journey_phase(uuid)` function defined in
 * supabase/migrations/014_journey_phase.sql.
 *
 * Used because `profiles.journey_phase` is currently stale — nothing in the
 * codebase recomputes/persists it (see TODO.md). This derives the same value
 * on read.
 *
 * `examOutcome` is accepted for API stability but currently ignored, mirroring
 * compute_journey_phase() SQL behavior. The only path to 'post_cert' is
 * daysSinceExam >= 0. (The SQL selects v_outcome but never branches on it.)
 *
 * Date math is normalized to UTC midnight on both sides to match Postgres
 * `date - date` semantics, since `exam_target_date` is a DATE column.
 */
export function computeJourneyPhase(
  input: ComputeJourneyPhaseInput,
): JourneyPhase {
  const { examTargetDate, sessionCount } = input
  const now = input.now ?? new Date()

  const examDate =
    examTargetDate == null
      ? null
      : examTargetDate instanceof Date
        ? examTargetDate
        : new Date(examTargetDate)

  if (examDate === null && sessionCount === 0) {
    return 'pre_study'
  }

  if (examDate !== null) {
    const daysToExam = daysBetween(examDate, now)
    const daysSinceExam = -daysToExam

    if (daysSinceExam > 90) return 'maintenance'
    if (daysSinceExam >= 0) return 'post_cert'
    if (daysToExam <= 14) return 'pre_exam'
  }

  return 'active_prep'
}
