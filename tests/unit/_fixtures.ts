import type { Tables } from '@/types/database'

type UCS = Tables<'user_concept_states'>

export function makeState(overrides: Partial<UCS> = {}): UCS {
  const base: UCS = {
    id: '00000000-0000-0000-0000-000000000000',
    user_id: '00000000-0000-0000-0000-000000000001',
    concept_id: '00000000-0000-0000-0000-000000000002',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    difficulty: 5,
    elapsed_days: 0,
    lapses: 0,
    last_rating: null,
    last_review: null,
    next_review_date: null,
    reps: 0,
    scheduled_days: 0,
    stability: 0,
    state: 0,
  }
  return { ...base, ...overrides }
}
