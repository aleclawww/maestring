export type { Database, Tables, Insert, Update } from './database'
export type {
  SubscriptionPlan,
  SubscriptionStatus,
  ProcessingStatus,
  StudyMode,
  QuestionType,
  FSRSState,
} from './database'
export type {
  Question,
  EvaluationResult,
  ConceptState,
  StudySession,
  SessionStats,
  StudyCard,
} from './study'

// ---- App types ----

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
  duration?: number
}

export interface OnboardingData {
  certificationId: string
  examTargetDate: string | null
  studyMinutesPerDay: number
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
  fullName: string
}

export interface UserProfile {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  onboardingCompleted: boolean
  examTargetDate: string | null
  studyMinutesPerDay: number
  currentStreak: number
  longestStreak: number
  totalXp: number
  referralCode: string
  plan: SubscriptionPlan
}

export interface DomainProgress {
  domainId: string
  slug: string
  name: string
  color: string
  examWeightPercent: number
  score: number
  conceptsTotal: number
  conceptsMastered: number
  conceptsDue: number
}

export interface SessionResult {
  sessionId: string
  mode: StudyMode
  correctCount: number
  totalCount: number
  accuracy: number
  xpEarned: number
  durationSeconds: number
  conceptsStudied: string[]
  newConceptsUnlocked: number
}

import type { SubscriptionPlan, StudyMode } from './database'
