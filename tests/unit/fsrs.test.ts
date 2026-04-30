import { describe, expect, it } from 'vitest'
import {
  answerToRating,
  calculateXpForAnswer,
  getDomainScore,
  getDueConcepts,
  getRetentionEstimate,
  getStudyPriority,
  initConceptState,
  Rating,
  scheduleReview,
} from '@/lib/fsrs'
import { makeState } from './_fixtures'

describe('lib/fsrs — answerToRating', () => {
  // Any wrong answer → Again regardless of concept difficulty.
  // Previously the code returned Hard for low-difficulty wrong answers,
  // which told FSRS the card was nearly known and *extended* the interval —
  // the opposite of the desired behavior for a missed answer.
  it('Again on wrong answer with high difficulty', () => {
    expect(answerToRating(false, 10_000, 0.9)).toBe(Rating.Again)
  })
  it('Again on wrong answer with low difficulty (was incorrectly Hard)', () => {
    expect(answerToRating(false, 10_000, 0.4)).toBe(Rating.Again)
  })
  it('Easy on fast correct answer', () => {
    expect(answerToRating(true, 5_000, 0.5)).toBe(Rating.Easy)
  })
  it('Good on medium-pace correct answer', () => {
    expect(answerToRating(true, 30_000, 0.5)).toBe(Rating.Good)
  })
  it('Hard on slow correct answer', () => {
    expect(answerToRating(true, 60_000, 0.5)).toBe(Rating.Hard)
  })
})

describe('lib/fsrs — initConceptState', () => {
  it('produces reps=0 and state=0 (New)', () => {
    const s = initConceptState()
    expect(s.reps).toBe(0)
    expect(s.state).toBe(0)
    expect(s.lapses).toBe(0)
  })
})

describe('lib/fsrs — scheduleReview', () => {
  it('advances reps after a Good rating', () => {
    const s = makeState()
    const result = scheduleReview(s, Rating.Good)
    expect(result.nextState.reps).toBe(1)
    expect(result.nextReviewDate).toBeInstanceOf(Date)
    expect(result.scheduledDays).toBeGreaterThanOrEqual(0)
  })

  it('Again rating increments lapses for a learned card', () => {
    const s = makeState({ reps: 3, stability: 10, state: 2, last_review: '2026-01-01T00:00:00Z' })
    const result = scheduleReview(s, Rating.Again)
    expect(result.nextState.lapses!).toBeGreaterThan(0)
  })
})

describe('lib/fsrs — getRetentionEstimate', () => {
  it('returns 0 for never-reviewed concepts', () => {
    expect(getRetentionEstimate(makeState({ reps: 0 }))).toBe(0)
  })
  it('decays with elapsed time', () => {
    const fresh = makeState({
      reps: 1,
      stability: 10,
      last_review: new Date(Date.now() - 1 * 86_400_000).toISOString(),
    })
    const old = makeState({
      reps: 1,
      stability: 10,
      last_review: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    })
    expect(getRetentionEstimate(fresh)).toBeGreaterThan(getRetentionEstimate(old))
  })
  it('is bounded within (0, 1]', () => {
    const s = makeState({ reps: 1, stability: 5, last_review: new Date().toISOString() })
    const r = getRetentionEstimate(s)
    expect(r).toBeGreaterThan(0)
    expect(r).toBeLessThanOrEqual(1)
  })
})

describe('lib/fsrs — getStudyPriority', () => {
  it('new concepts max priority', () => {
    expect(getStudyPriority(makeState({ reps: 0 }))).toBe(100)
  })
  it('overdue beats due-now same retention', () => {
    const reviewed = makeState({
      reps: 2,
      stability: 5,
      last_review: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      next_review_date: new Date(Date.now() - 1 * 86_400_000).toISOString(),
    })
    const notDue = makeState({
      reps: 2,
      stability: 5,
      last_review: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      next_review_date: new Date(Date.now() + 10 * 86_400_000).toISOString(),
    })
    expect(getStudyPriority(reviewed)).toBeGreaterThan(getStudyPriority(notDue))
  })
})

describe('lib/fsrs — getDueConcepts', () => {
  it('includes unseen + overdue, excludes future', () => {
    const unseen = { ...makeState({ reps: 0 }), concept_id: 'a' }
    const overdue = {
      ...makeState({
        reps: 3,
        stability: 5,
        next_review_date: new Date(Date.now() - 86_400_000).toISOString(),
      }),
      concept_id: 'b',
    }
    const future = {
      ...makeState({
        reps: 3,
        stability: 5,
        next_review_date: new Date(Date.now() + 5 * 86_400_000).toISOString(),
      }),
      concept_id: 'c',
    }
    const due = getDueConcepts([unseen, overdue, future])
    const ids = due.map(d => d.concept_id).sort()
    expect(ids).toEqual(['a', 'b'])
  })
})

describe('lib/fsrs — getDomainScore', () => {
  it('returns 0 for empty input', () => {
    expect(getDomainScore([])).toBe(0)
  })
  it('clamps between 0 and 100', () => {
    const strong = Array.from({ length: 5 }, () =>
      makeState({
        reps: 10,
        stability: 30,
        lapses: 0,
        last_review: new Date().toISOString(),
      })
    )
    const weak = Array.from({ length: 5 }, () => makeState({ reps: 1, stability: 0.5, lapses: 5 }))
    const s1 = getDomainScore(strong)
    const s0 = getDomainScore(weak)
    expect(s1).toBeGreaterThanOrEqual(0)
    expect(s1).toBeLessThanOrEqual(100)
    expect(s0).toBeGreaterThanOrEqual(0)
    expect(s0).toBeLessThanOrEqual(100)
    expect(s1).toBeGreaterThanOrEqual(s0)
  })
})

describe('lib/fsrs — calculateXpForAnswer', () => {
  it('returns 0 on wrong answer', () => {
    expect(calculateXpForAnswer(false, 10_000, 0.5, 0)).toBe(0)
  })
  it('scales with streak up to 2x cap', () => {
    const noStreak = calculateXpForAnswer(true, 10_000, 0.5, 0)
    const bigStreak = calculateXpForAnswer(true, 10_000, 0.5, 50)
    expect(bigStreak).toBeLessThanOrEqual(noStreak * 2 + 1)
    expect(bigStreak).toBeGreaterThan(noStreak)
  })
  it('rewards speed bonuses', () => {
    const fast = calculateXpForAnswer(true, 10_000, 0.5, 0)
    const slow = calculateXpForAnswer(true, 45_000, 0.5, 0)
    expect(fast).toBeGreaterThan(slow)
  })
})
