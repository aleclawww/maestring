// Re-exports of the auto-generated Supabase types plus convenience enum
// aliases. Generated file: types/supabase-generated.ts (do not edit).
// Regenerate after every schema migration with `npm run db:types`.

export type { Json, Database } from './supabase-generated'
export {
  type Tables,
  type TablesInsert as Insert,
  type TablesUpdate as Update,
} from './supabase-generated'

// Convenience aliases for enum-like columns. Kept hand-written because
// they're consumed in many call sites (props, validators, switch statements)
// where importing from the generated Enums helper is more verbose.
// Source of truth lives in supabase/migrations/.
export type SubscriptionPlan = 'free' | 'pro' | 'pro_annual' | 'enterprise'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete'
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type StudyMode = 'discovery' | 'review' | 'intensive' | 'maintenance' | 'exploration'
export type SessionStatus = 'active' | 'completed' | 'abandoned'
export type QuestionType = 'multiple_choice' | 'scenario' | 'drag_drop'
export type FSRSState = 0 | 1 | 2 | 3
