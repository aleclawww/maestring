import { describe, it, expect } from 'vitest'
import { scaledScore, didPass, EXAM_PASSING_SCORE } from '@/lib/exam/scoring'

describe('scaledScore', () => {
  it('returns 100 for zero correct', () => {
    expect(scaledScore(0, 65)).toBe(100)
  })
  it('returns 1000 for perfect', () => {
    expect(scaledScore(65, 65)).toBe(1000)
  })
  it('returns 100 for zero total (edge)', () => {
    expect(scaledScore(0, 0)).toBe(100)
  })
  it('maps 72% to ~748 (above passing)', () => {
    expect(scaledScore(47, 65)).toBeGreaterThanOrEqual(EXAM_PASSING_SCORE)
  })
  it('maps 68% to ~712 (below passing)', () => {
    // 68.9%: 100 + 0.689 * 900 = 720.1 — boundary edge. 44/65 = 67.7% => below.
    expect(scaledScore(44, 65)).toBeLessThan(EXAM_PASSING_SCORE)
  })
  it('clamps negative correct', () => {
    expect(scaledScore(-5, 65)).toBe(100)
  })
  it('clamps correct greater than total', () => {
    expect(scaledScore(70, 65)).toBe(1000)
  })
  it('is monotonic', () => {
    const a = scaledScore(30, 65)
    const b = scaledScore(31, 65)
    expect(b).toBeGreaterThan(a)
  })
})

describe('didPass', () => {
  it('passes at exactly 720', () => {
    expect(didPass(720)).toBe(true)
  })
  it('fails at 719', () => {
    expect(didPass(719)).toBe(false)
  })
  it('passes at 1000', () => {
    expect(didPass(1000)).toBe(true)
  })
})
