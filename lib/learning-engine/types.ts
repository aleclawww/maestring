/**
 * Gemelo Digital — type definitions for the 9-phase learning engine.
 * The orchestrator (orchestrator.ts) and transitions (transitions.ts)
 * both depend on these. UI consumers should also import from here.
 */

export const PHASES = [
  'calibration',
  'ambient',
  'anchoring',
  'retrieval_easy',
  'interleaving',
  'consolidation',
  'automation',
  'transfer',
  'mastery',
] as const

export type Phase = (typeof PHASES)[number]

export const PHASE_LABEL: Record<Phase, string> = {
  calibration: 'Calibration',
  ambient: 'Ambient exposure',
  anchoring: 'Anchoring',
  retrieval_easy: 'Retrieval (easy)',
  interleaving: 'Interleaving',
  consolidation: 'Consolidation',
  automation: 'Automation drills',
  transfer: 'Transfer',
  mastery: 'Mastery',
}

export const PHASE_DESCRIPTION: Record<Phase, string> = {
  calibration: 'Measure your working memory span, processing speed, chronotype and sleep window.',
  ambient: 'Read concepts passively to build familiarity — no testing.',
  anchoring: 'Open-ended prompts that force you to generate explanations in your own words.',
  retrieval_easy: 'Easy multiple-choice questions to build confidence and reinforce recall.',
  interleaving: 'Mixed questions across multiple domains to deepen discrimination.',
  consolidation: 'Spaced re-exposure with mandatory rest — protects against forgetting.',
  automation: 'Timed drills — answer correctly in under 8 seconds to build automaticity.',
  transfer: 'Multi-concept exam-style scenarios — applies what you know to new situations.',
  mastery: 'Long-term spaced maintenance — keep what you learned forever.',
}

// ─────────────────────────────────────────────────────────────────────────────
// Cognitive fingerprint v2
// ─────────────────────────────────────────────────────────────────────────────
export interface CognitiveFingerprintV2 {
  // v1 fields (preserved)
  background?: 'developer' | 'sysadmin' | 'business' | 'student' | 'other'
  peak_hour?: number
  avg_session_length_min?: number
  weakness_pattern?: string
  study_pace?: 'sprint' | 'cruise'
  explanation_depth?: 'deep' | 'concise'
  self_level_by_domain?: Record<string, number>
  // v2 fields
  working_memory_span?: number          // 2..9 (n-back chunks)
  processing_speed_ms?: number          // median ms
  chronotype?: 'morning' | 'evening' | 'neutral'
  sleep_window_start_hour?: number      // 0..23
  sleep_window_end_hour?: number        // 0..23
  cognitive_load_budget?: number        // 1..5 (questions before rest)
  confidence_calibration?: number       // accuracy - mean_confidence (–1..+1)
  v2_initialized_at?: string            // ISO timestamp
}

// ─────────────────────────────────────────────────────────────────────────────
// Learning state row
// ─────────────────────────────────────────────────────────────────────────────
export interface LearningState {
  user_id: string
  phase: Phase
  phase_entered_at: string
  ambient_exposures: number
  anchoring_responses: number
  retrieval_attempts: number
  retrieval_correct: number
  interleave_attempts: number
  interleave_correct: number
  automation_attempts: number
  automation_under8s: number
  transfer_attempts: number
  transfer_correct: number
  readiness_baseline: number | null
  readiness_baseline_at: string | null
  updated_at: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot used by transitions + orchestrator
// ─────────────────────────────────────────────────────────────────────────────
export interface LearningSnapshot {
  state: LearningState
  fingerprint: CognitiveFingerprintV2
  /** 0..100 — current readiness from get_exam_readiness RPC (Pilar 1). */
  readiness: number
  /** Local time at the user (server now() — clock-aware UI is responsibility of client). */
  now: Date
  /** True if `now` falls inside the user's configured sleep window. */
  inSleepWindow: boolean
  /** # of attempts in the past 24h (for cognitive load budget enforcement). */
  attemptsLast24h: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity types — what the orchestrator returns
// ─────────────────────────────────────────────────────────────────────────────
export type ActivityType =
  | 'rest_card'           // sleep window or load budget exceeded → block
  | 'calibration'         // ship to /onboarding/calibration
  | 'ambient_card'        // passive read — no answer
  | 'anchoring_prompt'    // open-ended generation prompt
  | 'mcq'                 // standard multiple-choice (existing /study flow)
  | 'mcq_timed'           // automation drill: 8s deadline
  | 'transfer_scenario'   // long multi-concept scenario (composed of N MCQs)

export interface ActivityDescriptor {
  type: ActivityType
  /** Human-readable phase label (drives the UI badge). */
  phase: Phase
  /** Optional reason when type is rest_card. */
  reason?: 'sleep_window' | 'load_budget_exceeded' | 'forgetting_detected'
  /** Optional concept slug when the activity targets a specific concept. */
  conceptSlug?: string
  /** For mcq_timed — deadline in seconds (default 8). */
  timeLimitSec?: number
  /** UI hint: what should we tell the user about why they're seeing this. */
  rationale: string
}
