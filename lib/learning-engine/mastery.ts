/**
 * Map FSRS state → mastery label + color for UI badges.
 *
 * The five tiers are deliberately coarse so users can scan a knowledge-map
 * grid and read it instantly without consulting a legend twice.
 */

export type MasteryTier = 'not_seen' | 'learning' | 'familiar' | 'proficient' | 'mastered'

export interface MasteryDescriptor {
  tier: MasteryTier
  label: string
  color: string         // tailwind class e.g. 'bg-success'
  textColor: string     // tailwind class
  hex: string           // raw hex for inline styles
  /** 0..100 — used for progress bars and aggregate stats. */
  percent: number
}

export interface ConceptStateLike {
  state?: number | null         // FSRS state: 0 New, 1 Learning, 2 Review, 3 Relearning
  reps?: number | null
  lapses?: number | null
  stability?: number | null     // days the brain will hold it
}

/**
 * tier rules:
 *  - no row OR reps == 0 + state == 0     → not_seen
 *  - state == 3 (relearning) OR lapses > 2 → learning (re-acquired)
 *  - reps < 3 OR stability < 3            → learning
 *  - reps >= 3 and stability < 7          → familiar
 *  - reps >= 5 and stability >= 7         → proficient
 *  - stability >= 21                      → mastered
 */
export function masteryOf(s: ConceptStateLike | null | undefined): MasteryDescriptor {
  if (!s || (!s.reps && (s.state ?? 0) === 0)) return TIERS.not_seen
  const reps = s.reps ?? 0
  const lapses = s.lapses ?? 0
  const stab = s.stability ?? 0
  const state = s.state ?? 0

  if (state === 3 || lapses > 2) return TIERS.learning
  if (reps < 3 || stab < 3) return TIERS.learning
  if (stab >= 21 && reps >= 5) return TIERS.mastered
  if (reps >= 5 && stab >= 7) return TIERS.proficient
  return TIERS.familiar
}

const TIERS: Record<MasteryTier, MasteryDescriptor> = {
  not_seen:   { tier: 'not_seen',   label: 'Not seen',   color: 'bg-text-muted/20',  textColor: 'text-text-muted',     hex: '#6b7280', percent: 0 },
  learning:   { tier: 'learning',   label: 'Learning',   color: 'bg-danger',         textColor: 'text-danger',         hex: '#ef4444', percent: 20 },
  familiar:   { tier: 'familiar',   label: 'Familiar',   color: 'bg-warning',        textColor: 'text-warning',        hex: '#f59e0b', percent: 50 },
  proficient: { tier: 'proficient', label: 'Proficient', color: 'bg-blue-500',       textColor: 'text-blue-400',       hex: '#3b82f6', percent: 75 },
  mastered:   { tier: 'mastered',   label: 'Mastered',   color: 'bg-success',        textColor: 'text-success',        hex: '#10b981', percent: 100 },
}

/** Aggregate counts per tier across an array of concept states. */
export function masteryCounts(states: ConceptStateLike[], totalConcepts: number): Record<MasteryTier, number> {
  const counts: Record<MasteryTier, number> = {
    not_seen: 0, learning: 0, familiar: 0, proficient: 0, mastered: 0,
  }
  for (const s of states) counts[masteryOf(s).tier]++
  // Concepts the user has NEVER touched (no row at all) count as not_seen.
  const seen = states.length
  if (totalConcepts > seen) counts.not_seen += totalConcepts - seen
  return counts
}

/** Average mastery percent (0..100) across all concepts in a domain. */
export function domainMasteryPercent(states: ConceptStateLike[], totalConcepts: number): number {
  if (totalConcepts === 0) return 0
  const sum = states.reduce((acc, s) => acc + masteryOf(s).percent, 0)
  return Math.round(sum / totalConcepts)
}
