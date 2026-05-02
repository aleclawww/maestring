/**
 * Phase transition rules. The orchestrator queries `decideNextPhase()` after
 * every snapshot refresh; if it returns a different phase, the orchestrator
 * writes the new phase + timestamp.
 *
 * Rules are deliberately conservative — easier to slip back than to leap
 * forward. The `bounceToConsolidation` check fires BEFORE forward checks so
 * forgetting always wins.
 */

import type { LearningSnapshot, Phase } from './types'

// Forgetting detection: readiness drops > 20pp in any 7-day window.
const FORGETTING_DROP_PP = 20
const FORGETTING_WINDOW_DAYS = 7

// Per-phase thresholds for forward advancement
export const THRESHOLDS = {
  ambient: {
    minExposures: 12 * 3,   // top-12 concepts × 3 exposures = 36 ambient cards
  },
  anchoring: {
    minResponses: 8,         // 8 open-ended generations
  },
  retrieval_easy: {
    minAttempts: 20,
    minAccuracy: 0.7,
  },
  interleaving: {
    minAttempts: 30,
    minAccuracy: 0.65,
  },
  consolidation: {
    minDaysSinceEnter: 1,   // must spend at least one day consolidating
  },
  automation: {
    minAttempts: 30,
    minUnder8sRatio: 0.6,
  },
  transfer: {
    minAttempts: 15,
    minAccuracy: 0.7,
    // Plus: cognitive_fingerprint.confidence_calibration must be in [-0.1, 0.1]
    // (well-calibrated metacognition before declaring mastery).
    maxAbsCalibration: 0.1,
  },
} as const

function daysBetween(a: Date, b: Date): number {
  return Math.abs((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))
}

function ratio(num: number, den: number): number {
  return den === 0 ? 0 : num / den
}

/** True if we should pull the user back to Consolidation due to forgetting. */
export function shouldBounceToConsolidation(s: LearningSnapshot): boolean {
  // Only relevant once we're past Ambient (no signal during exposure phase).
  if (s.state.phase === 'calibration' || s.state.phase === 'ambient') return false
  if (s.state.phase === 'consolidation') return false  // already there
  if (s.state.readiness_baseline == null || s.state.readiness_baseline_at == null) return false

  const baselineAt = new Date(s.state.readiness_baseline_at)
  const days = daysBetween(s.now, baselineAt)
  if (days > FORGETTING_WINDOW_DAYS) return false  // window expired

  const drop = s.state.readiness_baseline - s.readiness
  return drop > FORGETTING_DROP_PP
}

/** Returns the next phase, or null if the user should stay where they are. */
export function decideNextPhase(s: LearningSnapshot): Phase | null {
  // Forgetting bounce-back wins everything else.
  if (shouldBounceToConsolidation(s)) return 'consolidation'

  const cur = s.state.phase

  switch (cur) {
    case 'calibration':
      // Calibration is gated by fingerprint.v2_initialized_at — once present,
      // user moves to Ambient.
      if (s.fingerprint.v2_initialized_at) return 'ambient'
      return null

    case 'ambient':
      if (s.state.ambient_exposures >= THRESHOLDS.ambient.minExposures) return 'anchoring'
      return null

    case 'anchoring':
      if (s.state.anchoring_responses >= THRESHOLDS.anchoring.minResponses) return 'retrieval_easy'
      return null

    case 'retrieval_easy': {
      const acc = ratio(s.state.retrieval_correct, s.state.retrieval_attempts)
      if (
        s.state.retrieval_attempts >= THRESHOLDS.retrieval_easy.minAttempts &&
        acc >= THRESHOLDS.retrieval_easy.minAccuracy
      ) return 'interleaving'
      return null
    }

    case 'interleaving': {
      const acc = ratio(s.state.interleave_correct, s.state.interleave_attempts)
      if (
        s.state.interleave_attempts >= THRESHOLDS.interleaving.minAttempts &&
        acc >= THRESHOLDS.interleaving.minAccuracy
      ) return 'consolidation'
      return null
    }

    case 'consolidation': {
      const days = daysBetween(s.now, new Date(s.state.phase_entered_at))
      if (days >= THRESHOLDS.consolidation.minDaysSinceEnter) return 'automation'
      return null
    }

    case 'automation': {
      const fast = ratio(s.state.automation_under8s, s.state.automation_attempts)
      if (
        s.state.automation_attempts >= THRESHOLDS.automation.minAttempts &&
        fast >= THRESHOLDS.automation.minUnder8sRatio
      ) return 'transfer'
      return null
    }

    case 'transfer': {
      const acc = ratio(s.state.transfer_correct, s.state.transfer_attempts)
      const calOk =
        s.fingerprint.confidence_calibration == null ||
        Math.abs(s.fingerprint.confidence_calibration) <= THRESHOLDS.transfer.maxAbsCalibration
      if (
        s.state.transfer_attempts >= THRESHOLDS.transfer.minAttempts &&
        acc >= THRESHOLDS.transfer.minAccuracy &&
        calOk
      ) return 'mastery'
      return null
    }

    case 'mastery':
      return null  // terminal — only forgetting can pull you back
  }
}

/** Should we block this session entirely (sleep window or budget hit)? */
export function shouldRest(s: LearningSnapshot): { rest: true; reason: 'sleep_window' | 'load_budget_exceeded' } | { rest: false } {
  if (s.inSleepWindow) return { rest: true, reason: 'sleep_window' }
  const budget = s.fingerprint.cognitive_load_budget ?? 5
  // Treat budget as "max questions per 4-hour rolling block". 24h / 4h = 6 blocks.
  // So a daily soft cap is 6 × budget. Beyond that → rest.
  if (s.attemptsLast24h >= budget * 6) return { rest: true, reason: 'load_budget_exceeded' }
  return { rest: false }
}
