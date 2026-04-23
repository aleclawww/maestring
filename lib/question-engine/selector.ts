import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDueConcepts, getStudyPriority, initConceptState } from '@/lib/fsrs'
import { CERTIFICATION_ID as DEFAULT_CERT_ID } from '@/lib/knowledge-graph/aws-saa'
import { shuffle } from '@/lib/utils'
import { logger } from '@/lib/logger'
import type { StudyQueueItem } from '@/types/study'
import type { StudyMode, Tables } from '@/types/database'

type UserConceptState = Tables<'user_concept_states'>

const REVIEW_RATIO = 0.7
const MAX_CONSECUTIVE_SAME_DOMAIN = 2

// A3.3 — Interleaving hardening: after session shaping, enforce a hard cap of
// N consecutive items from the same domain. We rely on domain metadata stored
// per-item (added via enrichWithDomain below). If a run of same-domain items
// exceeds the cap, swap the offending item with the nearest item from a
// different domain later in the queue. Pure reorder — never changes WHICH
// items are in the session.
export function enforceInterleaving(
  items: Array<StudyQueueItem & { domainId?: string | null }>,
  maxRun: number
): StudyQueueItem[] {
  if (items.length <= maxRun) return items
  const out = [...items]
  for (let i = maxRun; i < out.length; i++) {
    const window = out.slice(i - maxRun, i + 1)
    const first = window[0]?.domainId
    if (!first) continue
    const sameRun = window.every(w => w.domainId === first)
    if (!sameRun) continue
    // Find nearest later item from a different domain to swap in.
    let swapIdx = -1
    for (let j = i + 1; j < out.length; j++) {
      if (out[j]?.domainId && out[j]?.domainId !== first) {
        swapIdx = j
        break
      }
    }
    if (swapIdx !== -1) {
      const tmp = out[i]!
      out[i] = out[swapIdx]!
      out[swapIdx] = tmp
    }
    // If no swap found, the queue has no alternatives — accept the run.
  }
  return out
}

/**
 * Pilar 4 — Optimización de Carga Cognitiva: warm-up → pico → cooldown.
 * Reorders an already-FSRS-selected queue so the session has a sane cognitive
 * shape: easy/familiar at the start (activate flow state), hard/fragile in the
 * middle (peak attention), light at the end (avoid frustration before close).
 * Operates on items already chosen by FSRS — does not change WHAT is studied,
 * only the ORDER.
 */
export function applySessionShape(
  items: StudyQueueItem[],
  states: Map<string, { stability: number; difficulty: number; lapses: number }>
): StudyQueueItem[] {
  if (items.length < 5) return items
  const warmupSize = Math.max(1, Math.floor(items.length * 0.2))
  const cooldownSize = Math.max(1, Math.floor(items.length * 0.2))

  const scored = items.map(it => {
    const s = states.get(it.conceptId)
    // stabilityScore high = stable & easy (good warm-up / cooldown candidate).
    // peakScore high = fragile/lapsed/difficult (good for the peak slot).
    const stabilityScore = s ? Math.min(1, s.stability / 21) * (1 - s.difficulty) : 0
    const peakScore = s
      ? (1 - Math.min(1, s.stability / 21)) * (s.difficulty + Math.min(1, s.lapses / 3))
      : 0.5
    return { it, stabilityScore, peakScore }
  })

  const byStability = [...scored].sort((a, b) => b.stabilityScore - a.stabilityScore)
  const warmup = byStability.slice(0, warmupSize).map(s => s.it)
  const usedIds = new Set(warmup.map(i => i.conceptId))

  const remainingForPeak = scored.filter(s => !usedIds.has(s.it.conceptId))
  const cooldown = [...remainingForPeak]
    .sort((a, b) => b.stabilityScore - a.stabilityScore)
    .slice(0, cooldownSize)
    .map(s => s.it)
  cooldown.forEach(c => usedIds.add(c.conceptId))

  const peak = scored
    .filter(s => !usedIds.has(s.it.conceptId))
    .sort((a, b) => b.peakScore - a.peakScore)
    .map(s => s.it)

  return [...warmup, ...peak, ...cooldown]
}

export async function buildStudyQueue(
  userId: string,
  mode: StudyMode,
  domainId?: string,
  certificationId: string = DEFAULT_CERT_ID,
  limit = 10
): Promise<StudyQueueItem[]> {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: states } = await supabase
    .from('user_concept_states')
    .select('*, concepts!inner(id, slug, name, domain_id, difficulty)')
    .eq('user_id', userId)

  const existingStates = (states ?? []) as Array<UserConceptState & {
    concepts: { id: string; slug: string; name: string; domain_id: string; difficulty: number }
  }>
  const existingConceptIds = new Set(existingStates.map(s => s.concept_id))

  const dueConcepts = getDueConcepts(existingStates as UserConceptState[])

  let conceptsQuery = admin
    .from('concepts')
    .select('id, slug, name, domain_id, difficulty')
    .eq('certification_id', certificationId)
    .eq('is_active', true)
  if (domainId) conceptsQuery = conceptsQuery.eq('domain_id', domainId)
  const { data: allConcepts } = await conceptsQuery

  const newConcepts = (allConcepts ?? []).filter(c => !existingConceptIds.has(c.id))

  if (mode === 'discovery') {
    return shuffle(newConcepts).slice(0, limit).map(c => ({
      conceptId: c.id,
      conceptSlug: c.slug,
      conceptName: c.name,
      difficulty: c.difficulty,
      priority: 100 - c.difficulty * 50,
      reason: 'new' as const,
    }))
  }

  if (mode === 'maintenance') {
    const mastered = existingStates
      .filter(s => s.reps >= 5 && s.lapses <= 1)
      .sort((a, b) => getStudyPriority(a) - getStudyPriority(b))
    return mastered.slice(0, limit).map(s => ({
      conceptId: s.concept_id,
      conceptSlug: s.concepts?.slug ?? '',
      conceptName: s.concepts?.name ?? '',
      difficulty: s.concepts?.difficulty ?? 0.5,
      priority: getStudyPriority(s),
      reason: 'scheduled' as const,
    }))
  }

  const reviewLimit = Math.ceil(limit * REVIEW_RATIO)
  const discoveryLimit = limit - reviewLimit

  const reviewItems: StudyQueueItem[] = (dueConcepts as typeof existingStates)
    .slice(0, reviewLimit)
    .map(s => ({
      conceptId: s.concept_id,
      conceptSlug: s.concepts?.slug ?? '',
      conceptName: s.concepts?.name ?? '',
      difficulty: s.concepts?.difficulty ?? 0.5,
      priority: getStudyPriority(s),
      reason: s.reps === 0 ? 'new' : s.lapses > 2 ? 'difficult' : 'scheduled',
    }))

  const discoveryItems: StudyQueueItem[] = shuffle(newConcepts)
    .slice(0, discoveryLimit)
    .map(c => ({
      conceptId: c.id,
      conceptSlug: c.slug,
      conceptName: c.name,
      difficulty: c.difficulty,
      priority: 50,
      reason: 'new' as const,
    }))

  let ri = 0
  let di = 0
  const interleaved: StudyQueueItem[] = []
  while (interleaved.length < limit) {
    if (ri < reviewItems.length && (di >= discoveryItems.length || interleaved.length % 3 !== 2)) {
      interleaved.push(reviewItems[ri++]!)
    } else if (di < discoveryItems.length) {
      interleaved.push(discoveryItems[di++]!)
    } else {
      break
    }
  }

  const stateMap = new Map(
    existingStates.map(s => [
      s.concept_id,
      { stability: s.stability, difficulty: s.difficulty, lapses: s.lapses },
    ])
  )
  const shaped = applySessionShape(interleaved, stateMap)

  // Build a conceptId → domainId map from both existingStates and newConcepts
  // so the interleaver can enforce the max-consecutive-domain rule.
  const domainByConcept = new Map<string, string>()
  existingStates.forEach(s => {
    if (s.concepts?.domain_id) domainByConcept.set(s.concept_id, s.concepts.domain_id)
  })
  ;(allConcepts ?? []).forEach(c => {
    if (c.domain_id) domainByConcept.set(c.id, c.domain_id)
  })
  const enriched = shaped.map(it => ({ ...it, domainId: domainByConcept.get(it.conceptId) }))
  return enforceInterleaving(enriched, MAX_CONSECUTIVE_SAME_DOMAIN)
}

export async function ensureConceptStatesExist(
  userId: string,
  certificationId: string = DEFAULT_CERT_ID
): Promise<void> {
  const admin = createAdminClient()

  const { data: concepts } = await admin
    .from('concepts')
    .select('id')
    .eq('certification_id', certificationId)
    .eq('is_active', true)
  if (!concepts?.length) return

  const { data: existing } = await admin
    .from('user_concept_states')
    .select('concept_id')
    .eq('user_id', userId)

  const existingIds = new Set((existing ?? []).map(s => s.concept_id))
  const missing = concepts.filter(c => !existingIds.has(c.id))
  if (!missing.length) return

  const BATCH = 100
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH)
    const initialState = initConceptState()
    // Previously this insert was a bare `await` with no error check, so a
    // failure here left the user with zero concept_states and a broken study
    // queue (selector returns []). Throw so the caller (study/session POST
    // and the onboarding fallback path) returns 5xx instead of silently
    // landing the user in an empty session.
    const { error: insertErr } = await admin.from('user_concept_states').insert(
      batch.map(c => ({ user_id: userId, concept_id: c.id, ...initialState }))
    )
    if (insertErr) {
      logger.error(
        { err: insertErr, userId, certificationId, batchStart: i, batchSize: batch.length },
        'Failed to seed user_concept_states batch'
      )
      throw new Error(
        `Failed to seed concept states: ${insertErr.message ?? 'unknown error'}`
      )
    }
  }
}

export async function getRecentMistakes(userId: string, limit = 5): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('question_attempts')
    .select('concept_id, concepts!inner(name)')
    .eq('user_id', userId)
    .eq('is_correct', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  return ((data ?? []) as unknown as Array<{ concepts: { name: string } | Array<{ name: string }> | null }>)
    .map(a => Array.isArray(a.concepts) ? a.concepts[0]?.name : a.concepts?.name)
    .filter((n): n is string => typeof n === 'string')
}
