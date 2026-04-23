import { beforeEach, describe, expect, it, vi } from 'vitest'
import { enforceInterleaving, applySessionShape } from '@/lib/question-engine/selector'
import type { StudyQueueItem } from '@/types/study'

// Chainable Supabase-style builder for ensureConceptStatesExist tests. The
// helper touches three different table paths:
//   1. concepts.select(...).eq(...).eq(...)            → data, error
//   2. user_concept_states.select(...).eq(...)          → data, error
//   3. user_concept_states.insert(...)                  → { error }
// The hoisted mock routes by (table, op) so each test can program what the
// insert (and optionally the reads) return.
const supabaseMock = vi.hoisted(() => {
  type MockState = {
    conceptsData: Array<{ id: string }>
    existingStatesData: Array<{ concept_id: string }>
    insertError: { message: string } | null
  }
  const state: MockState = {
    conceptsData: [{ id: 'c1' }, { id: 'c2' }],
    existingStatesData: [],
    insertError: null,
  }
  const insertSpy = vi.fn(async () => ({ error: state.insertError }))
  const from = vi.fn((table: string) => {
    if (table === 'concepts') {
      // select → eq → eq, with terminal awaited shape.
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        then: (resolve: (r: { data: Array<{ id: string }>; error: null }) => void) =>
          resolve({ data: state.conceptsData, error: null }),
      }
      return chain
    }
    if (table === 'user_concept_states') {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        then: (resolve: (r: { data: Array<{ concept_id: string }>; error: null }) => void) =>
          resolve({ data: state.existingStatesData, error: null }),
        insert: insertSpy,
      }
      return chain
    }
    throw new Error(`Unexpected table in mock: ${table}`)
  })
  return { state, from, insertSpy, client: { from } as unknown as { from: typeof from } }
})

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => supabaseMock.client,
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => supabaseMock.client,
}))
vi.mock('@/lib/logger', () => {
  const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() }
  return { default: logger, logger }
})

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

describe('selector — ensureConceptStatesExist', () => {
  beforeEach(() => {
    supabaseMock.state.conceptsData = [{ id: 'c1' }, { id: 'c2' }]
    supabaseMock.state.existingStatesData = []
    supabaseMock.state.insertError = null
    supabaseMock.insertSpy.mockClear()
  })

  it('inserts the missing concepts when the batch insert succeeds', async () => {
    const { ensureConceptStatesExist } = await import('@/lib/question-engine/selector')
    await expect(ensureConceptStatesExist('user-1')).resolves.toBeUndefined()
    expect(supabaseMock.insertSpy).toHaveBeenCalledTimes(1)
  })

  it('throws when the batch insert returns an error (no more silent swallow)', async () => {
    supabaseMock.state.insertError = { message: 'duplicate key violates unique constraint' }
    const { ensureConceptStatesExist } = await import('@/lib/question-engine/selector')
    await expect(ensureConceptStatesExist('user-1')).rejects.toThrow(
      /Failed to seed concept states.*duplicate key/
    )
  })

  it('skips the insert entirely when every concept already has a state', async () => {
    supabaseMock.state.existingStatesData = [{ concept_id: 'c1' }, { concept_id: 'c2' }]
    const { ensureConceptStatesExist } = await import('@/lib/question-engine/selector')
    await ensureConceptStatesExist('user-1')
    expect(supabaseMock.insertSpy).not.toHaveBeenCalled()
  })
})
