import { describe, it, expect } from 'vitest'
import { computeJourneyPhase } from '@/lib/journey/compute'

const NOW = new Date('2026-05-05T12:00:00Z')

function inDays(days: number): Date {
  return new Date(Date.UTC(2026, 4, 5 + days))
}

describe('computeJourneyPhase', () => {
  it('returns pre_study when no exam date and zero sessions', () => {
    expect(
      computeJourneyPhase({
        examTargetDate: null,
        sessionCount: 0,
        examOutcome: null,
        now: NOW,
      }),
    ).toBe('pre_study')
  })

  it('returns active_prep when no exam date but sessions exist', () => {
    expect(
      computeJourneyPhase({
        examTargetDate: null,
        sessionCount: 5,
        examOutcome: null,
        now: NOW,
      }),
    ).toBe('active_prep')
  })

  it('returns active_prep when exam in 60 days, zero sessions', () => {
    expect(
      computeJourneyPhase({
        examTargetDate: inDays(60),
        sessionCount: 0,
        examOutcome: null,
        now: NOW,
      }),
    ).toBe('active_prep')
  })

  it('returns active_prep when exam in 60 days with many sessions', () => {
    expect(
      computeJourneyPhase({
        examTargetDate: inDays(60),
        sessionCount: 50,
        examOutcome: null,
        now: NOW,
      }),
    ).toBe('active_prep')
  })

  it('returns pre_exam when exam in 10 days', () => {
    expect(
      computeJourneyPhase({
        examTargetDate: inDays(10),
        sessionCount: 0,
        examOutcome: null,
        now: NOW,
      }),
    ).toBe('pre_exam')
  })

  it('returns pre_exam at the 14-day boundary', () => {
    expect(
      computeJourneyPhase({
        examTargetDate: inDays(14),
        sessionCount: 0,
        examOutcome: null,
        now: NOW,
      }),
    ).toBe('pre_exam')
  })

  it('returns active_prep just past the 14-day boundary', () => {
    expect(
      computeJourneyPhase({
        examTargetDate: inDays(15),
        sessionCount: 0,
        examOutcome: null,
        now: NOW,
      }),
    ).toBe('active_prep')
  })

  it('returns post_cert when exam was 5 days ago', () => {
    expect(
      computeJourneyPhase({
        examTargetDate: inDays(-5),
        sessionCount: 0,
        examOutcome: null,
        now: NOW,
      }),
    ).toBe('post_cert')
  })

  it('returns post_cert at the same-day boundary (daysSinceExam = 0)', () => {
    expect(
      computeJourneyPhase({
        examTargetDate: inDays(0),
        sessionCount: 0,
        examOutcome: null,
        now: NOW,
      }),
    ).toBe('post_cert')
  })

  it('returns maintenance when exam was 100 days ago', () => {
    expect(
      computeJourneyPhase({
        examTargetDate: inDays(-100),
        sessionCount: 0,
        examOutcome: null,
        now: NOW,
      }),
    ).toBe('maintenance')
  })

  it('returns post_cert at the 90-day post-exam boundary (>90 needed for maintenance)', () => {
    expect(
      computeJourneyPhase({
        examTargetDate: inDays(-90),
        sessionCount: 0,
        examOutcome: null,
        now: NOW,
      }),
    ).toBe('post_cert')
  })

  it('returns maintenance just past 90 days post-exam', () => {
    expect(
      computeJourneyPhase({
        examTargetDate: inDays(-91),
        sessionCount: 0,
        examOutcome: null,
        now: NOW,
      }),
    ).toBe('maintenance')
  })

  it('does NOT force post_cert when examOutcome=passed but exam date is future (mirrors SQL behavior)', () => {
    expect(
      computeJourneyPhase({
        examTargetDate: inDays(30),
        sessionCount: 5,
        examOutcome: 'passed',
        now: NOW,
      }),
    ).toBe('active_prep')
  })

  it('outcome is ignored when set: result matches null-outcome case', () => {
    const base = {
      examTargetDate: inDays(60),
      sessionCount: 10,
      now: NOW,
    } as const
    const withoutOutcome = computeJourneyPhase({
      ...base,
      examOutcome: null,
    })
    const withPassed = computeJourneyPhase({ ...base, examOutcome: 'passed' })
    const withFailed = computeJourneyPhase({ ...base, examOutcome: 'failed' })
    expect(withPassed).toBe(withoutOutcome)
    expect(withFailed).toBe(withoutOutcome)
  })

  it('accepts string ISO date for examTargetDate', () => {
    expect(
      computeJourneyPhase({
        examTargetDate: '2026-07-04',
        sessionCount: 0,
        examOutcome: null,
        now: NOW,
      }),
    ).toBe('active_prep')
  })

  it('accepts string ISO date that triggers pre_exam', () => {
    expect(
      computeJourneyPhase({
        examTargetDate: '2026-05-15',
        sessionCount: 0,
        examOutcome: null,
        now: NOW,
      }),
    ).toBe('pre_exam')
  })
})
