/**
 * Phase orchestrator. Single entry point: `nextActivity(userId)`.
 *
 * 1. Loads/initialises learning state + fingerprint + readiness + sleep status.
 * 2. Fires forgetting bounce-back if needed.
 * 3. Decides whether the user must rest (sleep window or load budget hit).
 * 4. Otherwise, picks a phase-appropriate ActivityDescriptor.
 *
 * The descriptor tells the UI WHAT to render. The orchestrator does NOT pick
 * the specific concept — for question-bearing activities it delegates to
 * /api/study/generate (which uses the existing FSRS selector). For ambient
 * cards it picks the next under-exposed concept by stability.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { CONCEPTS } from '@/lib/knowledge-graph/aws-saa'
import type {
  ActivityDescriptor,
  CognitiveFingerprintV2,
  LearningSnapshot,
  LearningState,
} from './types'
import { decideNextPhase, shouldRest } from './transitions'

interface ProfileRow {
  cognitive_fingerprint?: CognitiveFingerprintV2 | null
}

async function loadSnapshot(userId: string): Promise<LearningSnapshot | null> {
  const supabase = createAdminClient()

  // 1. ensure_user_learning_state — creates the row if missing.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: stateRow, error: stateErr } = await (supabase.rpc as any)(
    'ensure_user_learning_state',
    { p_user_id: userId },
  )
  if (stateErr) {
    logger.error({ err: stateErr, userId }, 'orchestrator: ensure_user_learning_state failed')
    return null
  }
  const state = stateRow as LearningState

  // 2. Profile fingerprint
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase
    .from('profiles')
    .select('cognitive_fingerprint' as any) as any)
    .eq('id', userId)
    .maybeSingle()
  const fingerprint = ((profile as ProfileRow | null)?.cognitive_fingerprint ?? {}) as CognitiveFingerprintV2

  // 3. Readiness (Pilar 1 — get_exam_readiness RPC). Returns 0..100.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: readinessRow } = await (supabase.rpc as any)('get_exam_readiness', { p_user_id: userId })
  const readiness =
    typeof readinessRow === 'number'
      ? readinessRow
      : Array.isArray(readinessRow) && typeof readinessRow[0]?.readiness === 'number'
        ? readinessRow[0].readiness
        : 0

  // 4. Sleep window check
  const now = new Date()
  const inSleepWindow = isInSleepWindow(now, fingerprint)

  // 5. Attempts in past 24h
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const { count: attemptsLast24h } = await supabase
    .from('question_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since)

  return {
    state,
    fingerprint,
    readiness,
    now,
    inSleepWindow,
    attemptsLast24h: attemptsLast24h ?? 0,
  }
}

function isInSleepWindow(now: Date, fp: CognitiveFingerprintV2): boolean {
  if (fp.sleep_window_start_hour == null || fp.sleep_window_end_hour == null) return false
  const h = now.getHours()
  const start = fp.sleep_window_start_hour
  const end = fp.sleep_window_end_hour
  // Window may wrap midnight (e.g. 23 → 7).
  if (start === end) return false
  if (start < end) return h >= start && h < end
  return h >= start || h < end
}

async function applyTransitionIfNeeded(s: LearningSnapshot): Promise<LearningSnapshot> {
  const next = decideNextPhase(s)
  if (!next || next === s.state.phase) return s

  const supabase = createAdminClient()
  // Reset counters that are scoped to a single phase block on transition.
  const resetByPhase: Record<string, Record<string, number | null>> = {
    consolidation: {
      retrieval_attempts: 0, retrieval_correct: 0,
      interleave_attempts: 0, interleave_correct: 0,
      automation_attempts: 0, automation_under8s: 0,
      readiness_baseline: s.readiness, readiness_baseline_at: s.now.toISOString() as unknown as number,
    },
  }
  const updates: Record<string, unknown> = {
    phase: next,
    phase_entered_at: s.now.toISOString(),
    ...(resetByPhase[next] ?? {}),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('user_learning_state') as any)
    .update(updates)
    .eq('user_id', s.state.user_id)
  if (error) {
    logger.error({ err: error, userId: s.state.user_id, from: s.state.phase, to: next }, 'orchestrator: phase transition write failed')
    return s
  }
  logger.info(
    { userId: s.state.user_id, from: s.state.phase, to: next, readiness: s.readiness },
    'orchestrator: phase transition'
  )
  return {
    ...s,
    state: {
      ...s.state,
      phase: next,
      phase_entered_at: s.now.toISOString(),
      ...(next === 'consolidation' && {
        retrieval_attempts: 0, retrieval_correct: 0,
        interleave_attempts: 0, interleave_correct: 0,
        automation_attempts: 0, automation_under8s: 0,
        readiness_baseline: s.readiness,
        readiness_baseline_at: s.now.toISOString(),
      }),
    },
  }
}

/** Picks the first concept the user has been least exposed to. */
function pickAmbientConcept(seenSlugs: Set<string>): string | null {
  // Top-12 concepts by exam weight × difficulty inverse — we prefer foundational
  // concepts first. Quick approximation: the first concepts of each domain.
  const topByDomain = ['ec2-instance-types', 's3-storage-classes', 'iam-fundamentals', 'vpc-fundamentals',
    'rds-multi-az', 'lambda-fundamentals', 'cloudfront-caching', 'route53-routing', 'sqs-vs-sns-vs-eventbridge',
    'cloudwatch-metrics-alarms', 'kms-encryption', 'well-architected-framework']
  for (const slug of topByDomain) {
    if (!seenSlugs.has(slug) && CONCEPTS.some(c => c.slug === slug)) return slug
  }
  // Fallback: any unseen concept
  const any = CONCEPTS.find(c => !seenSlugs.has(c.slug))
  return any?.slug ?? null
}

export async function nextActivity(userId: string): Promise<ActivityDescriptor> {
  const snap0 = await loadSnapshot(userId)
  if (!snap0) {
    return {
      type: 'rest_card',
      phase: 'calibration',
      reason: 'load_budget_exceeded',
      rationale: "We couldn't load your learning state. Try again in a moment.",
    }
  }

  // 1. Apply phase transition first (so the rest of decisions see the new phase).
  const snap = await applyTransitionIfNeeded(snap0)

  // 2. Calibration always wins if the user hasn't done it yet.
  if (snap.state.phase === 'calibration') {
    return {
      type: 'calibration',
      phase: 'calibration',
      rationale: 'First we measure how your memory and timing work — 5 minutes, one-time.',
    }
  }

  // 3. Sleep / load gate.
  const rest = shouldRest(snap)
  if (rest.rest) {
    return {
      type: 'rest_card',
      phase: snap.state.phase,
      reason: rest.reason,
      rationale:
        rest.reason === 'sleep_window'
          ? 'You configured this hour as your sleep window — sleep beats cramming for retention.'
          : 'You hit your daily cognitive-load budget. Come back after a break — your brain consolidates while you rest.',
    }
  }

  // 4. Forgetting was already handled in applyTransitionIfNeeded → snap.state.phase
  //    will be 'consolidation' if it triggered.

  // 5. Phase-appropriate activity.
  switch (snap.state.phase) {
    case 'ambient': {
      const seenAmbient = new Set<string>()  // TODO: persist seen ambient slugs in a table; for now just rotate
      // Light-touch rotation by exposure count — modulo over CONCEPTS.
      const idx = snap.state.ambient_exposures % Math.max(CONCEPTS.length, 1)
      const concept = CONCEPTS[idx]
      if (!concept) {
        return {
          type: 'mcq', phase: 'ambient',
          rationale: 'No ambient concept available — falling back to MCQ.',
        }
      }
      return {
        type: 'ambient_card', phase: 'ambient',
        conceptSlug: concept.slug,
        rationale: 'Read this through. No quiz — your brain is just getting familiar with the shape of it.',
      }
    }

    case 'anchoring':
      return {
        type: 'anchoring_prompt', phase: 'anchoring',
        rationale: 'Type your own explanation — generation forces deeper encoding than passive reading.',
      }

    case 'retrieval_easy':
      return {
        type: 'mcq', phase: 'retrieval_easy',
        rationale: 'Easy retrieval first — building confidence and the feel of the question patterns.',
      }

    case 'interleaving':
      return {
        type: 'mcq', phase: 'interleaving',
        rationale: 'Domains intentionally mixed — your brain learns to discriminate when to apply what.',
      }

    case 'consolidation':
      return {
        type: 'mcq', phase: 'consolidation',
        rationale: 'Spaced re-exposure of weak concepts — defending against decay before moving on.',
      }

    case 'automation':
      return {
        type: 'mcq_timed', phase: 'automation',
        timeLimitSec: 8,
        rationale: 'Answer in under 8 seconds — at exam speed, recognition must be automatic.',
      }

    case 'transfer':
      return {
        type: 'transfer_scenario', phase: 'transfer',
        rationale: 'Multi-concept exam-style scenario — applies what you know to a fresh situation.',
      }

    case 'mastery':
      return {
        type: 'mcq', phase: 'mastery',
        rationale: 'Long-term maintenance — sparse refresh of concepts about to fade.',
      }
  }

  // Type-system safety — should be unreachable.
  return {
    type: 'mcq', phase: snap.state.phase,
    rationale: 'Standard practice question.',
  }
}
