'use client'

import { useReducer, useCallback, useEffect, useRef } from 'react'
import { QuestionCard } from './QuestionCard'
import { SessionProgress } from './SessionProgress'
import { SessionSummary } from './SessionSummary'
import { AnswerFeedback } from './AnswerFeedback'
import type { Question, EvaluationResult, SessionStats } from '@/types/study'
import type { StudyMode } from '@/types/database'
import { UpgradeButton } from '@/components/billing/UpgradeButton'
import { track } from '@/lib/analytics'

type StudyState =
  | { phase: 'setup' }
  | { phase: 'loading' }
  | { phase: 'question'; question: Question; questionNumber: number; total: number; startedAt: number }
  | { phase: 'feedback'; question: Question; selectedIndex: number; evaluation: EvaluationResult; questionNumber: number; total: number; timeTaken: number }
  | { phase: 'summary'; stats: SessionStats; sessionId: string }
  | { phase: 'quota_exceeded'; used: number; quota: number }

type StudyAction =
  | { type: 'START'; mode: StudyMode }
  | { type: 'QUESTION_LOADED'; question: Question; questionNumber: number; total: number }
  | { type: 'ANSWER_SELECTED'; selectedIndex: number; evaluation: EvaluationResult; timeTaken: number }
  | { type: 'CONTINUE' }
  | { type: 'SESSION_COMPLETE'; stats: SessionStats; sessionId: string }
  | { type: 'RESET' }
  | { type: 'LOADING' }
  | { type: 'QUOTA_EXCEEDED'; used: number; quota: number }

function reducer(state: StudyState, action: StudyAction): StudyState {
  switch (action.type) {
    case 'START':
    case 'LOADING':
      return { phase: 'loading' }
    case 'QUESTION_LOADED':
      return {
        phase: 'question',
        question: action.question,
        questionNumber: action.questionNumber,
        total: action.total,
        startedAt: Date.now(),
      }
    case 'ANSWER_SELECTED':
      if (state.phase !== 'question') return state
      return {
        phase: 'feedback',
        question: state.question,
        selectedIndex: action.selectedIndex,
        evaluation: action.evaluation,
        questionNumber: state.questionNumber,
        total: state.total,
        timeTaken: action.timeTaken,
      }
    case 'CONTINUE':
      return { phase: 'loading' }
    case 'SESSION_COMPLETE':
      return { phase: 'summary', stats: action.stats, sessionId: action.sessionId }
    case 'RESET':
      return { phase: 'setup' }
    case 'QUOTA_EXCEEDED':
      return { phase: 'quota_exceeded', used: action.used, quota: action.quota }
    default:
      return state
  }
}

const SESSION_LENGTH = 10

interface StudySessionProps {
  userId: string
  activeSessionId?: string
  dueCount: number
}

export function StudySession({ userId, activeSessionId, dueCount }: StudySessionProps) {
  const [state, dispatch] = useReducer(reducer, { phase: 'setup' })
  const sessionIdRef = useRef<string | null>(activeSessionId ?? null)
  const answersRef = useRef<Array<{ conceptId: string; isCorrect: boolean; timeTaken: number }>>([])
  const prefetchedRef = useRef<Question | null>(null)
  const modeRef = useRef<StudyMode>('review')

  // Guard against accidental page close during active study
  useEffect(() => {
    if (state.phase !== 'question' && state.phase !== 'feedback') return
    const handleUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [state.phase])

  const startSession = useCallback(async (mode: StudyMode = 'review') => {
    dispatch({ type: 'LOADING' })
    modeRef.current = mode

    try {
      // Create session
      const sessionRes = await fetch('/api/study/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      const { data: session } = await sessionRes.json()
      sessionIdRef.current = session.id
      answersRef.current = []
      track({ name: 'study_session_started', properties: { mode, session_id: session.id } })

      // Load first question
      await loadNextQuestion(mode, 1)
    } catch (err) {
      console.error('Failed to start session', err)
      dispatch({ type: 'RESET' })
    }
  }, [])

  const loadNextQuestion = useCallback(async (mode: StudyMode = 'review', questionNumber: number) => {
    dispatch({ type: 'LOADING' })

    // Use prefetched question if available
    if (prefetchedRef.current && questionNumber > 1) {
      const q = prefetchedRef.current
      prefetchedRef.current = null
      dispatch({ type: 'QUESTION_LOADED', question: q, questionNumber, total: SESSION_LENGTH })
      return
    }

    try {
      const res = await fetch('/api/study/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, sessionId: sessionIdRef.current }),
      })
      if (res.status === 402) {
        const body = (await res.json()) as { used?: number; quota?: number; plan?: string }
        const used = body.used ?? 0
        const quota = body.quota ?? 0
        track({ name: 'quota_hit', properties: { used, quota, plan: body.plan ?? 'free' } })
        dispatch({ type: 'QUOTA_EXCEEDED', used, quota })
        return
      }
      const { data: question } = await res.json()
      dispatch({ type: 'QUESTION_LOADED', question, questionNumber, total: SESSION_LENGTH })
    } catch (err) {
      console.error('Failed to load question', err)
      dispatch({ type: 'RESET' })
    }
  }, [])

  const submitAnswer = useCallback(async (selectedIndex: number, firstAttemptCorrect: boolean) => {
    if (state.phase !== 'question') return
    const timeTaken = Date.now() - state.startedAt
    const questionNumber = state.questionNumber

    // Prefetch next question in background
    if (questionNumber < SESSION_LENGTH) {
      fetch('/api/study/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'review', sessionId: sessionIdRef.current }),
      })
        .then(r => r.json())
        .then(({ data }) => { prefetchedRef.current = data })
        .catch(() => {})
    }

    try {
      const res = await fetch('/api/study/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: state.question.id,
          selectedIndex,
          timeTakenMs: timeTaken,
          sessionId: sessionIdRef.current,
          conceptId: state.question.conceptId,
          firstAttemptCorrect,
        }),
      })
      const { data: evaluation } = await res.json()

      answersRef.current.push({
        conceptId: state.question.conceptId,
        isCorrect: evaluation.isCorrect && firstAttemptCorrect,
        timeTaken,
      })
      track({
        name: 'question_answered',
        properties: {
          is_correct: evaluation.isCorrect,
          mode: modeRef.current,
          time_taken_ms: timeTaken,
          concept_id: state.question.conceptId,
        },
      })

      dispatch({
        type: 'ANSWER_SELECTED',
        selectedIndex,
        evaluation,
        timeTaken,
      })
    } catch {
      dispatch({ type: 'RESET' })
    }
  }, [state])

  const continueSession = useCallback(async () => {
    if (state.phase !== 'feedback') return
    const nextNumber = state.questionNumber + 1

    if (nextNumber > SESSION_LENGTH) {
      // Complete session
      const correct = answersRef.current.filter(a => a.isCorrect).length
      await fetch('/api/study/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionIdRef.current }),
      })
      track({
        name: 'study_session_completed',
        properties: {
          mode: modeRef.current,
          session_id: sessionIdRef.current ?? undefined,
          total: SESSION_LENGTH,
          correct,
        },
      })
      dispatch({
        type: 'SESSION_COMPLETE',
        sessionId: sessionIdRef.current ?? '',
        stats: {
          correctCount: correct,
          incorrectCount: SESSION_LENGTH - correct,
          totalQuestions: SESSION_LENGTH,
          accuracy: correct / SESSION_LENGTH,
          totalTimeSeconds: 0,
          xpEarned: correct * 12,
          conceptsStudied: answersRef.current.map(a => a.conceptId),
          streakBonus: 0,
        },
      })
    } else {
      await loadNextQuestion('review', nextNumber)
    }
  }, [state, loadNextQuestion])

  // Setup view
  if (state.phase === 'setup') {
    return (
      <div className="flex min-h-full flex-col items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 text-6xl">📖</div>
          <h1 className="mb-2 text-2xl font-bold text-text-primary">Sesión de Estudio</h1>
          <p className="mb-8 text-text-secondary">
            {dueCount > 0
              ? `Tienes ${dueCount} conceptos listos para repasar.`
              : 'Excelente, estás al día. Exploremos nuevos conceptos.'}
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { mode: 'review' as const, label: 'Repaso', desc: 'Conceptos vencidos', icon: '🔄' },
              { mode: 'discovery' as const, label: 'Descubrimiento', desc: 'Nuevos conceptos', icon: '🆕' },
              { mode: 'intensive' as const, label: 'Intensivo', desc: 'Preguntas difíciles', icon: '🔥' },
              { mode: 'maintenance' as const, label: 'Mantenimiento', desc: 'Refuerzo ligero', icon: '✅' },
            ].map(({ mode, label, desc, icon }) => (
              <button
                key={mode}
                onClick={() => startSession(mode)}
                className="flex flex-col items-center rounded-xl border border-border bg-surface p-4 hover:border-primary/50 hover:bg-primary/5 transition-colors text-center"
              >
                <span className="text-2xl mb-2">{icon}</span>
                <p className="text-sm font-semibold text-text-primary">{label}</p>
                <p className="text-xs text-text-muted">{desc}</p>
              </button>
            ))}
          </div>
          {/* Pilar 3 — Modo Exploración: ZDP segura, sin penalización FSRS */}
          <button
            onClick={() => startSession('exploration')}
            className="w-full flex items-center gap-3 rounded-xl border border-dashed border-warning/40 bg-warning/5 p-4 hover:bg-warning/10 transition-colors text-left mb-4"
          >
            <span className="text-2xl">🧪</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-warning">Modo Exploración</p>
              <p className="text-xs text-text-muted">
                Practica sin afectar tu Readiness — ideal para probar territorio nuevo.
              </p>
            </div>
          </button>
        </div>
      </div>
    )
  }

  // Loading view
  if (state.phase === 'loading') {
    return (
      <div className="flex min-h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-text-secondary">Generando pregunta...</p>
        </div>
      </div>
    )
  }

  // Quota-exceeded view
  if (state.phase === 'quota_exceeded') {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-warning/40 bg-warning/5 p-6 text-center space-y-4">
          <div className="text-3xl">⏳</div>
          <h2 className="text-xl font-semibold text-text-primary">
            Cuota diaria alcanzada
          </h2>
          <p className="text-sm text-text-secondary">
            Has usado <strong>{state.used} / {state.quota}</strong> preguntas hoy en el plan gratuito.
            Vuelve mañana, o desbloquea sesiones ilimitadas con Pro.
          </p>
          <UpgradeButton plan="monthly" className="btn-primary w-full py-3 rounded-lg">
            ✨ Hazte Pro — 7 días gratis
          </UpgradeButton>
          <button
            type="button"
            onClick={() => dispatch({ type: 'RESET' })}
            className="text-xs text-text-muted hover:text-text-secondary"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  // Summary view
  if (state.phase === 'summary') {
    return (
      <SessionSummary
        stats={state.stats}
        sessionId={state.sessionId}
        onNewSession={() => dispatch({ type: 'RESET' })}
      />
    )
  }

  const isExploration = modeRef.current === 'exploration'
  const explorationBanner = isExploration ? (
    <div className="mx-4 sm:mx-6 mt-3 flex items-center gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning">
      <span>🧪</span>
      <span>Modo Exploración — esta sesión no avanza tu Readiness Score.</span>
    </div>
  ) : null

  // Question view
  if (state.phase === 'question') {
    return (
      <div className="flex h-full flex-col">
        <SessionProgress
          current={state.questionNumber}
          total={state.total}
          onAbandon={async () => {
            await fetch('/api/study/session', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: sessionIdRef.current }),
            })
            dispatch({ type: 'RESET' })
          }}
        />
        {explorationBanner}
        <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-2xl">
            <QuestionCard question={state.question} onAnswer={submitAnswer} />
          </div>
        </div>
      </div>
    )
  }

  // Feedback view
  if (state.phase === 'feedback') {
    return (
      <div className="flex h-full flex-col">
        <SessionProgress
          current={state.questionNumber}
          total={state.total}
          answered={answersRef.current.map(a => a.isCorrect)}
        />
        {explorationBanner}
        <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-2xl">
            <AnswerFeedback
              question={state.question}
              selectedIndex={state.selectedIndex}
              evaluation={state.evaluation}
              onContinue={continueSession}
              isLast={state.questionNumber >= state.total}
            />
          </div>
        </div>
      </div>
    )
  }

  return null
}
