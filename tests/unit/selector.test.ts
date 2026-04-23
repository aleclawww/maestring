import { describe, expect, it } from 'vitest'
import { enforceInterleaving, applySessionShape } from '@/lib/question-engine/selector'
import type { StudyQueueItem } from '@/types/study'

function item(
  id: string,
  domainId: string | null = null,
  overrides: Partial<StudyQueueItem> = {}
): StudyQueueItem & { domainId?: string | null } {
  return {
    conceptId: id,
    conceptSlug: `slug-${id}`,
    conceptName: `Concept ${id}`,
    difficulty: 0.5,
    priority: 50,
    reason: 'scheduled',
    ...overrides,
    domainId,
  }
}

describe('selector — enforceInterleaving', () => {
  it('passes through queues shorter than the cap', () => {
    const q = [item('a', 'd1'), item('b', 'd1')]
    const out = enforceInterleaving(q, 2)
    expect(out.map(i => i.conceptId)).toEqual(['a', 'b'])
  })

  it('swaps an offending run with a later item from a different domain', () => {
    // cap=2 means 3 in a row is not allowed
    const q = [
      item('a', 'd1'),
      item('b', 'd1'),
      item('c', 'd1'), // violates max-run-of-2
      item('d', 'd2'),
    ]
    const out = enforceInterleaving(q, 2)
    const ids = out.map(i => i.conceptId)
    // c must have been swapped with d
    expect(ids).toEqual(['a', 'b', 'd', 'c'])
  })

  it('accepts a run when no alternative domain exists', () => {
    const q = [item('a', 'd1'), item('b', 'd1'), item('c', 'd1')]
    const out = enforceInterleaving(q, 2)
    expect(out.map(i => i.conceptId)).toEqual(['a', 'b', 'c'])
  })

  it('skips items with missing domain metadata without mutating order', () => {
    const q = [item('a', null), item('b', null), item('c', null)]
    const out = enforceInterleaving(q, 2)
    expect(out.map(i => i.conceptId)).toEqual(['a', 'b', 'c'])
  })

  it('preserves queue length and membership', () => {
    const q = [
      item('a', 'd1'), item('b', 'd1'), item('c', 'd1'),
      item('d', 'd2'), item('e', 'd2'), item('f', 'd2'),
    ]
    const out = enforceInterleaving(q, 2)
    expect(out).toHaveLength(q.length)
    expect(out.map(i => i.conceptId).sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })
})

describe('selector — applySessionShape', () => {
  it('returns queue unchanged when under threshold', () => {
    const q = [item('a'), item('b'), item('c')]
    const out = applySessionShape(q, new Map())
    expect(out.map(i => i.conceptId)).toEqual(['a', 'b', 'c'])
  })

  it('places highest-stability item at the start (warm-up)', () => {
    const q = [
      item('frag'), item('stable'), item('mid1'), item('mid2'), item('mid3'),
    ]
    const states = new Map([
      ['stable', { stability: 30, difficulty: 0.1, lapses: 0 }],
      ['frag', { stability: 1, difficulty: 0.9, lapses: 3 }],
      ['mid1', { stability: 10, difficulty: 0.5, lapses: 1 }],
      ['mid2', { stability: 10, difficulty: 0.5, lapses: 1 }],
      ['mid3', { stability: 10, difficulty: 0.5, lapses: 1 }],
    ])
    const out = applySessionShape(q, states)
    expect(out[0]!.conceptId).toBe('stable')
  })

  it('places fragile/difficult item in the peak slot, not the ends', () => {
    const q = [
      item('s1'), item('s2'), item('frag'), item('s3'), item('s4'),
    ]
    const states = new Map([
      ['s1', { stability: 20, difficulty: 0.2, lapses: 0 }],
      ['s2', { stability: 18, difficulty: 0.2, lapses: 0 }],
      ['s3', { stability: 22, difficulty: 0.2, lapses: 0 }],
      ['s4', { stability: 25, difficulty: 0.2, lapses: 0 }],
      ['frag', { stability: 0.5, difficulty: 0.95, lapses: 5 }],
    ])
    const out = applySessionShape(q, states)
    const fragIdx = out.findIndex(i => i.conceptId === 'frag')
    expect(fragIdx).toBeGreaterThan(0)
    expect(fragIdx).toBeLessThan(out.length - 1)
  })

  it('preserves queue membership', () => {
    const q = Array.from({ length: 10 }, (_, i) => item(`c${i}`))
    const states = new Map(
      q.map((it, i) => [it.conceptId, { stability: i * 2, difficulty: i / 10, lapses: 0 }])
    )
    const out = applySessionShape(q, states)
    expect(out).toHaveLength(q.length)
    expect(out.map(i => i.conceptId).sort()).toEqual(q.map(i => i.conceptId).sort())
  })
})
