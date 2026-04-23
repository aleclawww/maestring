import { z } from 'zod'

export const ScenarioContextSchema = z
  .object({
    numbers: z.record(z.union([z.number(), z.string()])).optional(),
    architecture: z.string().optional(),
    costTable: z.array(z.record(z.union([z.number(), z.string()]))).optional(),
    constraints: z.array(z.string()).optional(),
  })
  .nullable()
  .optional()

export const QuestionSchema = z.object({
  id: z.string().uuid(),
  conceptId: z.string().uuid(),
  conceptName: z.string(),
  conceptSlug: z.string(),
  domainId: z.string().uuid(),
  questionText: z.string().min(10),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(10),
  difficulty: z.number().min(0).max(1),
  questionType: z.enum(['multiple_choice', 'scenario', 'drag_drop']),
  // Rich content (migration 017) — optional for backward compat with generated questions.
  hint: z.string().nullable().optional(),
  explanationDeep: z.string().nullable().optional(),
  keyInsight: z.string().nullable().optional(),
  scenarioContext: ScenarioContextSchema,
  tags: z.array(z.string()).default([]),
})

export const EvaluationResultSchema = z.object({
  isCorrect: z.boolean(),
  score: z.number().min(0).max(1),
  explanation: z.string(),
  keyInsight: z.string(),
  relatedConcepts: z.array(z.string()),
  studyTip: z.string().optional(),
  // Pilar 3 — error productivo: micro-pregunta de elaboración
  // generada solo cuando isCorrect=false. Activa el efecto de generación
  // (Bjork) en lugar de mostrar la respuesta correcta directamente.
  elaboration: z
    .object({
      prompt: z.string(),
      validReasoningHint: z.string(),
    })
    .optional(),
})

export const ConceptStateSchema = z.object({
  conceptId: z.string().uuid(),
  userId: z.string().uuid(),
  stability: z.number().min(0),
  difficulty: z.number().min(0).max(1),
  elapsedDays: z.number().int().min(0),
  scheduledDays: z.number().int().min(0),
  reps: z.number().int().min(0),
  lapses: z.number().int().min(0),
  state: z.number().int().min(0).max(3),
  lastReview: z.string().nullable(),
  nextReviewDate: z.string().nullable(),
})

export const StudySessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  mode: z.enum(['discovery', 'review', 'intensive', 'maintenance']),
  certificationId: z.string(),
  isCompleted: z.boolean(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
})

export const SessionStatsSchema = z.object({
  correctCount: z.number().int().min(0),
  incorrectCount: z.number().int().min(0),
  totalQuestions: z.number().int().min(0),
  accuracy: z.number().min(0).max(1),
  totalTimeSeconds: z.number().int().min(0),
  xpEarned: z.number().int().min(0),
  conceptsStudied: z.array(z.string()),
  streakBonus: z.number().min(0),
})

export type Question = z.infer<typeof QuestionSchema>
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>
export type ConceptState = z.infer<typeof ConceptStateSchema>
export type StudySession = z.infer<typeof StudySessionSchema>
export type SessionStats = z.infer<typeof SessionStatsSchema>

export interface StudyCard {
  question: Question
  conceptState: ConceptState
  attemptStartedAt: number
}

export interface StudyQueueItem {
  conceptId: string
  conceptSlug: string
  conceptName: string
  difficulty: number
  questionId?: string
  priority: number
  reason: 'overdue' | 'new' | 'difficult' | 'scheduled'
}

export interface GenerateQuestionRequest {
  conceptSlug: string
  difficulty?: number
  recentMistakes?: string[]
  mode?: 'discovery' | 'review' | 'intensive' | 'maintenance'
}

export interface EvaluateAnswerRequest {
  questionId: string
  selectedIndex: number
  timeTakenMs: number
  sessionId: string
}
