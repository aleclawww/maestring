// Hand-maintained type surface that mirrors supabase/migrations/.
// Run `npm run db:types` to regenerate the autogen file
// (types/supabase-generated.ts) once Supabase is running locally.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type SubscriptionPlan = 'free' | 'pro' | 'pro_annual' | 'enterprise'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete'
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type StudyMode = 'discovery' | 'review' | 'intensive' | 'maintenance' | 'exploration'
export type SessionStatus = 'active' | 'completed' | 'abandoned'
export type QuestionType = 'multiple_choice' | 'scenario' | 'drag_drop'
export type FSRSState = 0 | 1 | 2 | 3

interface ProfileRow {
  id: string
  created_at: string
  updated_at: string
  full_name: string | null
  avatar_url: string | null
  onboarding_completed: boolean
  exam_target_date: string | null
  exam_date: string | null
  study_minutes_per_day: number
  current_streak: number
  longest_streak: number
  last_study_date: string | null
  referral_code: string
  referred_by: string | null
  total_xp: number
  timezone: string
  notification_preferences: Json
  // Added in migrations 013-015 — keep in sync with hand-written types until
  // npm run db:types regenerates from a real DB instance.
  cognitive_fingerprint: Json | null
  journey_phase: 'pre_study' | 'active_prep' | 'pre_exam' | 'post_cert' | 'maintenance'
  exam_outcome: 'passed' | 'failed' | 'unknown' | null
  exam_scaled_score: number | null
  last_readiness_score: number | null
  last_readiness_at: string | null
}

interface OrganizationRow {
  id: string
  created_at: string
  name: string
  slug: string
  is_personal: boolean
  owner_id: string
  logo_url: string | null
}

interface OrganizationMemberRow {
  id: string
  organization_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  created_at: string
}

interface SubscriptionRow {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  organization_id: string | null
  plan: SubscriptionPlan
  status: SubscriptionStatus
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  trial_end: string | null
}

interface KnowledgeDomainRow {
  id: string
  created_at: string
  certification_id: string
  slug: string
  name: string
  description: string | null
  exam_weight_percent: number
  color: string
  icon: string | null
  sort_order: number
}

interface DomainTopicRow {
  id: string
  domain_id: string
  slug: string
  name: string
  sort_order: number
}

interface ConceptRow {
  id: string
  created_at: string
  certification_id: string
  domain_id: string
  topic_id: string | null
  slug: string
  name: string
  description: string
  key_facts: Json
  exam_tips: Json
  aws_services: Json
  confused_with: Json
  difficulty: number
  is_active: boolean
}

interface QuestionRow {
  id: string
  created_at: string
  concept_id: string
  question_text: string
  options: Json
  correct_index: number
  explanation: string
  difficulty: number
  question_type: QuestionType
  source: string
  is_active: boolean
  times_shown: number
  times_correct: number
}

interface QuestionFeedbackRow {
  id: string
  created_at: string
  question_id: string
  user_id: string
  feedback_type: 'wrong_answer' | 'unclear' | 'outdated' | 'good'
  comment: string | null
}

interface UserDocumentRow {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  org_id: string | null
  filename: string
  file_path: string
  file_size: number
  mime_type: string
  processing_status: ProcessingStatus
  chunk_count: number
  error_message: string | null
  metadata: Json
}

interface ContentChunkRow {
  id: string
  created_at: string
  document_id: string
  chunk_index: number
  content: string
  embedding: number[] | null
  token_count: number
  metadata: Json
}

interface ChunkConceptLinkRow {
  id: string
  chunk_id: string
  concept_id: string
  relevance_score: number
}

interface UserConceptStateRow {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  concept_id: string
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  reps: number
  lapses: number
  state: FSRSState
  last_review: string | null
  next_review_date: string | null
  last_rating: number | null
}

interface StudySessionRow {
  id: string
  created_at: string
  completed_at: string | null
  abandoned_at: string | null
  user_id: string
  mode: StudyMode
  certification_id: string
  concepts_studied: number
  correct_count: number
  incorrect_count: number
  total_time_seconds: number
  xp_earned: number
  is_completed: boolean
  status: SessionStatus
  domain_id: string | null
  target_questions: number
  questions_answered: number
  correct_answers: number
  started_at: string
  ended_at: string | null
}

interface QuestionAttemptRow {
  id: string
  created_at: string
  session_id: string
  question_id: string
  user_id: string
  concept_id: string
  user_answer_index: number
  is_correct: boolean
  time_taken_ms: number
  evaluation_result: Json | null
}

interface MagicLinkUseRow {
  id: string
  created_at: string
  jti: string
  user_id: string
}

interface ReferralRow {
  id: string
  created_at: string
  referrer_id: string
  referred_id: string
  code: string
  rewarded_at: string | null
}

type AsTable<R> = {
  Row: R
  Insert: Partial<R> & { id?: string }
  Update: Partial<R>
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      profiles: AsTable<ProfileRow>
      organizations: AsTable<OrganizationRow>
      organization_members: AsTable<OrganizationMemberRow>
      subscriptions: AsTable<SubscriptionRow>
      knowledge_domains: AsTable<KnowledgeDomainRow>
      domain_topics: AsTable<DomainTopicRow>
      concepts: AsTable<ConceptRow>
      questions: AsTable<QuestionRow>
      question_feedback: AsTable<QuestionFeedbackRow>
      user_documents: AsTable<UserDocumentRow>
      content_chunks: AsTable<ContentChunkRow>
      chunk_concept_links: AsTable<ChunkConceptLinkRow>
      user_concept_states: AsTable<UserConceptStateRow>
      study_sessions: AsTable<StudySessionRow>
      question_attempts: AsTable<QuestionAttemptRow>
      magic_link_uses: AsTable<MagicLinkUseRow>
      referrals: AsTable<ReferralRow>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      subscription_plan: SubscriptionPlan
      subscription_status: SubscriptionStatus
      processing_status: ProcessingStatus
      study_mode: StudyMode
      question_type: QuestionType
    }
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Insert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type Update<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
