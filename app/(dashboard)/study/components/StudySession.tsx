'use client'

import { useReducer, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { QuestionCard } from './QuestionCard'
import { SessionProgress } from './SessionProgress'
import { SessionSummary } from './SessionSummary'
import { AnswerFeedback } from './AnswerFeedback'
import type { Question, EvaluationResult, SessionStats } from '@/types/study'
import type { StudyMode } from '@/types/database'
import { UpgradeButton } from '@/components/billing/UpgradeButton'
import { track } from '@/lib/analytics'
import {
  Beaker as BeakerIcon,
  BookOpen as BookOpenIcon,
  CheckCircle2 as CheckCircleIcon,
  Clock as ClockIcon,
  Flame as FlameIcon,
  Loader2 as Loader2Icon,
  RotateCcw as RotateCcwIcon,
  Sparkles as SparklesIcon,
} from 'lucide-react'
import { Card } from '@/components/v2'
import { buttonVariants } from '@/components/v2/Button'
import { cn } from '@/lib/utils'

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

export function StudySession({ userId: _userId, activeSessionId, dueCount }: StudySessionProps) {
  const searchParams = useSearchParams()
  // ?timed=1 (or ?timed=12 to set custom seconds) enables the Automation drill
  // countdown — used by the Coach when phase = automation.
  const timedParam = searchParams?.get('timed')
  const timeLimitSec = timedParam ? Math.max(3, Math.min(60, Number(timedParam) || 8)) : undefined
  const [state, dispatch] = useReducer(reducer, { phase: 'setup' })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const sessionIdRef = useRef<string | null>(activeSessionId ?? null)
  const answersRef = useRef<Array<{ conceptId: string; isCorrect: boolean; timeTaken: number }>>([])
  const totalXpRef = useRef<number>(0)
  const prefetchedRef = useRef<Question | null>(null)
  const modeRef = useRef<StudyMode>('review')
  const sessionStartedAtRef = useRef<number | null>(null)

  // Dispatch RESET and surface a user-visible error message simultaneously.
  // Both setErrorMsg (useState) and dispatch (useReducer) are guaranteed
  // stable references, so this callback has a stable identity with [] deps.
  const resetWithError = useCallback((msg: string) => {
    setErrorMsg(msg)
    dispatch({ type: 'RESET' })
  }, [])

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
    setErrorMsg(null)
    dispatch({ type: 'LOADING' })
    modeRef.current = mode

    try {
      // Create session.
      //
      // Previously `const { data: session } = await sessionRes.json()` skipped
      // the `res.ok` check entirely, so a 429 (rate limit) or 500 (DB write
      // failed, RLS drift) from /api/study/session produced `session = undefined`.
      // The next line `sessionIdRef.current = session.id` threw TypeError into
      // the outer `catch { dispatch({ type: 'RESET' }) }` → user was dumped
      // back to setup with no clue why the Start button "did nothing". Log the
      // real status + body so ops can tell transient infra from a repeatable
      // bug, and keep the RESET so the UI doesn't hang.
      const sessionRes = await fetch('/api/study/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      if (!sessionRes.ok) {
        const j = (await sessionRes.json().catch(() => ({}))) as { error?: string; message?: string }
        console.error('StudySession startSession failed', {
          status: sessionRes.status,
          msg: j.message ?? j.error ?? `HTTP ${sessionRes.status}`,
          mode,
        })
        resetWithError("Couldn't start your session — please try again.")
        return
      }
      const { data: session } = await sessionRes.json()
      if (!session?.id) {
        console.error('StudySession startSession returned malformed body', { mode })
        resetWithError("Session setup returned an unexpected response — please try again.")
        return
      }
      sessionIdRef.current = session.id
      answersRef.current = []
      sessionStartedAtRef.current = Date.now()
      track({ name: 'study_session_started', properties: { mode, session_id: session.id } })

      // Load first question
      await loadNextQuestion(mode, 1)
    } catch (err) {
      console.error('Failed to start session', err)
      resetWithError("Network error — please check your connection and try again.")
    }
    // loadNextQuestion is defined after startSession in component scope; listing it
    // in deps here would cause a TDZ ReferenceError. It is stable (its own dep is
    // resetWithError which never changes), so the stale-closure risk is zero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetWithError])

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
      // Previously only the 402 quota branch was handled; every other non-2xx
      // (429 rate limit, 500 LLM/generator failure, 502/504 platform blips)
      // fell through to `const { data: question } = await res.json()`, which
      // either destructured `question = undefined` and downstream reducers
      // shoved `undefined` into the QuestionCard (blank options, no text) or
      // threw JSON.parse on a non-JSON error page and RESET via the catch
      // with no diagnostics. Users saw "the session just stopped" or a broken
      // question card. Surface the real status + body.
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
        // 409 means the selector found no questions for this specific mode
        // (e.g. Maintenance with no mastered concepts, or all concepts perfectly
        // scheduled far in the future). Show the server's human-readable message
        // rather than a generic "data was invalid" error.
        if (res.status === 409) {
          resetWithError(j.message ?? "No questions available for this mode. Try Review instead.")
          return
        }
        // 503 means a required API key is not configured (e.g. ANTHROPIC_API_KEY).
        // Surface the server's message directly — it tells the developer exactly
        // what env var to set, which is far more useful than "couldn't load question".
        if (res.status === 503) {
          resetWithError(j.message ?? "Question generation is not configured. Check your environment variables.")
          return
        }
        console.error('StudySession loadNextQuestion failed', {
          status: res.status,
          msg: j.message ?? j.error ?? `HTTP ${res.status}`,
          mode,
          questionNumber,
          sessionId: sessionIdRef.current,
        })
        resetWithError("Couldn't load the next question — your session was reset. Please start a new one.")
        return
      }
      const { data: question } = await res.json()
      if (!question?.id || !Array.isArray(question.options)) {
        console.error('StudySession loadNextQuestion returned malformed body', {
          mode,
          questionNumber,
          sessionId: sessionIdRef.current,
        })
        resetWithError("Question data was invalid — your session was reset. Please start a new one.")
        return
      }
      dispatch({ type: 'QUESTION_LOADED', question, questionNumber, total: SESSION_LENGTH })
    } catch (err) {
      console.error('Failed to load question', err)
      resetWithError("Network error loading question — please check your connection and try again.")
    }
  }, [resetWithError])

  const submitAnswer = useCallback(async (selectedIndex: number, firstAttemptCorrect: boolean, confidence?: number) => {
    if (state.phase !== 'question') return
    const timeTaken = Date.now() - state.startedAt
    const questionNumber = state.questionNumber

    // Prefetch next question in background.
    //
    // Previously the `.catch(() => {})` swallowed EVERY failure mode:
    //   - transient 5xx from /api/study/generate (rate limit, LLM timeout)
    //   - JSON parse errors when the response isn't JSON (HTML error page)
    //   - `.then(({ data }) => ...)` destructuring `data` off a non-`data`
    //     response shape (e.g. `{ error: "..." }` after a quota miss)
    // The user's on-demand fetch path still works, so this is a soft degrade
    // — not worth surfacing to the user. But swallowing diagnostics meant a
    // spike in "the next question takes 4s to load" tickets was untraceable
    // because the prefetch silently failing looked identical to prefetch
    // succeeding from the client's perspective. `console.warn` costs nothing
    // and gives support a copy-paste trail when someone opens DevTools.
    if (questionNumber < SESSION_LENGTH) {
      fetch('/api/study/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: modeRef.current, sessionId: sessionIdRef.current }),
      })
        .then(async r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then(j => { prefetchedRef.current = j?.data ?? null })
        .catch(err => {
          console.warn('StudySession prefetch failed (next question will load on demand)', err)
        })
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
          ...(typeof confidence === 'number' ? { confidence } : {}),
        }),
      })
      // Previously `const { data: evaluation } = await res.json()` skipped
      // the `res.ok` check entirely. When /api/study/evaluate returned
      // 429 (rate limit) or 500 (LLM grading error / DB write failure),
      // `evaluation` was `undefined` from the destructure and the very
      // next line (`evaluation.isCorrect`) threw TypeError — which fell
      // into the bare `catch { dispatch({ type: 'RESET' }) }` below.
      // The user saw their answer vanish, the session reset to setup,
      // and no error message — looked like a misclick, but the server
      // had often *already* recorded the attempt and bumped FSRS state,
      // so retrying from the setup screen would serve a DIFFERENT
      // question while the original attempt sat persisted but invisible.
      // Worst case: user answers the "same" concept twice from the top,
      // FSRS sees two attempts on different question IDs, calibrator
      // drifts. Fail loud: log the server body, track it, and still
      // dispatch RESET so the UI doesn't hang — but with diagnostics.
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
        const msg = errBody.message ?? errBody.error ?? `HTTP ${res.status}`
        console.error('StudySession evaluate failed', {
          status: res.status,
          msg,
          questionId: state.question.id,
          sessionId: sessionIdRef.current,
          conceptId: state.question.conceptId,
        })
        resetWithError("There was a problem checking your answer — your session was reset.")
        return
      }
      const { data: evaluation } = await res.json()
      if (!evaluation || typeof evaluation.isCorrect !== 'boolean') {
        console.error('StudySession evaluate returned malformed body', {
          questionId: state.question.id,
          sessionId: sessionIdRef.current,
          conceptId: state.question.conceptId,
        })
        resetWithError("Answer evaluation returned an unexpected response — your session was reset.")
        return
      }

      answersRef.current.push({
        conceptId: state.question.conceptId,
        isCorrect: evaluation.isCorrect && firstAttemptCorrect,
        timeTaken,
      })
      // Accumulate XP from server so the summary shows the actual awarded value
      // rather than the `correct * 12` stub that was hardcoded before.
      totalXpRef.current += (evaluation.xpEarned ?? 0)
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
    } catch (err) {
      console.error('StudySession evaluate network error', {
        err,
        questionId: state.question.id,
        conceptId: state.question.conceptId,
      })
      resetWithError("Network error submitting your answer — please check your connection and try again.")
    }
  }, [state, resetWithError])

  const continueSession = useCallback(async () => {
    if (state.phase !== 'feedback') return
    const nextNumber = state.questionNumber + 1

    if (nextNumber > SESSION_LENGTH) {
      // Complete session
      const correct = answersRef.current.filter(a => a.isCorrect).length
      // Silent swallow previously: a bare `await fetch(...)` discarded both
      // non-2xx responses and network errors. A 500 from the PATCH left the
      // session `status='active'` on the server while the client happily
      // showed the summary. The user saw "Great job, 8/10 correct!" while
      // their streak never bumped (the bump_user_streak trigger fires on
      // `status='completed'`), stats never saved, and next dashboard visit
      // showed a phantom "Resume active session" prompt for a session they
      // thought was done. Log loudly and still show the summary — the user
      // genuinely finished the 10 questions, so resetting the UI to setup
      // would feel worse than showing slightly-stale stats. Diagnostics now
      // have something to correlate "my streak didn't update" reports.
      try {
        const completeRes = await fetch('/api/study/session', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionIdRef.current }),
        })
        if (!completeRes.ok) {
          console.error(
            'StudySession complete PATCH failed',
            { status: completeRes.status, sessionId: sessionIdRef.current }
          )
        }
      } catch (err) {
        console.error('StudySession complete PATCH network error', err)
      }
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
          totalTimeSeconds: sessionStartedAtRef.current
              ? Math.round((Date.now() - sessionStartedAtRef.current) / 1000)
              : 0,
          xpEarned: totalXpRef.current,
          conceptsStudied: answersRef.current.map(a => a.conceptId),
          streakBonus: 0,
        },
      })
    } else {
      await loadNextQuestion(modeRef.current, nextNumber)
    }
  }, [state, loadNextQuestion])

  // Setup view
  if (state.phase === 'setup') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-2">
        <div className="w-full max-w-[480px]">
          <Card padding="lg" tone="emphasized" className="text-center sm:p-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-v2-gradient-brand text-white shadow-v2-button">
              <BookOpenIcon className="h-6 w-6" strokeWidth={2} />
            </div>
            <h2 className="v2-display mt-5 text-[24px] sm:text-[28px]">
              {dueCount > 0 ? 'Pick a session mode' : 'All caught up'}
            </h2>
            <p className="mt-2 text-[14px] leading-[1.6] text-v2-foreground-muted">
              {dueCount > 0
                ? `You have ${dueCount} concept${dueCount === 1 ? '' : 's'} ready to review.`
                : "Nice — let's explore new concepts."}
            </p>

            {errorMsg && (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-v2-error/30 bg-v2-error-soft px-3 py-2 text-[13px] text-v2-error"
              >
                {errorMsg}
              </div>
            )}

            <div className="mt-7 grid grid-cols-2 gap-2.5">
              {[
                {
                  mode: 'review' as const,
                  label: 'Review',
                  desc: 'Due concepts',
                  Icon: RotateCcwIcon,
                },
                {
                  mode: 'discovery' as const,
                  label: 'Discovery',
                  desc: 'New concepts',
                  Icon: SparklesIcon,
                },
                {
                  mode: 'intensive' as const,
                  label: 'Intensive',
                  desc: 'Hard questions',
                  Icon: FlameIcon,
                },
                {
                  mode: 'maintenance' as const,
                  label: 'Maintenance',
                  desc: 'Light reinforcement',
                  Icon: CheckCircleIcon,
                },
              ].map(({ mode, label, desc, Icon }) => (
                <button
                  key={mode}
                  onClick={() => startSession(mode)}
                  className="group flex flex-col items-start rounded-xl border border-v2-border bg-v2-surface p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-v2-brand/40 hover:bg-v2-brand-soft/40 hover:shadow-v2-soft"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-v2-brand-soft text-v2-brand">
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                  </div>
                  <p className="mt-3 text-[14px] font-bold text-v2-foreground">
                    {label}
                  </p>
                  <p className="text-[12px] text-v2-foreground-muted">{desc}</p>
                </button>
              ))}
            </div>

            {/* Exploration mode — safe zone, no FSRS penalty */}
            <button
              onClick={() => startSession('exploration')}
              className="mt-3 flex w-full items-start gap-3 rounded-xl border border-dashed border-v2-warning/40 bg-v2-warning-soft/40 p-4 text-left transition-colors hover:bg-v2-warning-soft/70"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-v2-warning-soft text-v2-warning">
                <BeakerIcon className="h-4 w-4" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-v2-warning">
                  Exploration mode
                </p>
                <p className="text-[12px] leading-[1.5] text-v2-foreground-muted">
                  Practice without affecting your Readiness — great for testing
                  new ground.
                </p>
              </div>
            </button>
          </Card>
        </div>
      </div>
    )
  }

  // Loading view
  if (state.phase === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-v2-foreground-muted">
          <Loader2Icon className="h-6 w-6 animate-spin" strokeWidth={2.25} />
          <p className="text-[13px]">Generating question…</p>
        </div>
      </div>
    )
  }

  // Quota-exceeded view
  if (state.phase === 'quota_exceeded') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-2">
        <Card padding="lg" tone="emphasized" className="w-full max-w-[460px] text-center sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-v2-warning-soft text-v2-warning">
            <ClockIcon className="h-6 w-6" strokeWidth={2} />
          </div>
          <h2 className="v2-display mt-5 text-[24px] sm:text-[28px]">
            Daily quota reached
          </h2>
          <p className="mt-2 text-[14px] leading-[1.6] text-v2-foreground-muted">
            You've used{' '}
            <strong className="text-v2-foreground">
              {state.used} / {state.quota}
            </strong>{' '}
            questions today on the free plan. Come back tomorrow, or unlock
            unlimited sessions with Pro.
          </p>
          <div className="mt-6">
            <UpgradeButton
              plan="monthly"
              className={cn(
                buttonVariants({ variant: 'primary', size: 'lg' }),
                'w-full',
              )}
            >
              <SparklesIcon className="h-4 w-4" strokeWidth={2.25} />
              Go Pro — 7 days free
            </UpgradeButton>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'RESET' })}
            className="mt-4 text-[12px] font-medium text-v2-foreground-muted hover:text-v2-foreground"
          >
            Back to start
          </button>
        </Card>
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
    <div className="mx-2 mt-3 flex items-center gap-2 rounded-lg border border-dashed border-v2-warning/40 bg-v2-warning-soft/50 px-3 py-2 text-[12px] font-medium text-v2-warning sm:mx-0">
      <BeakerIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
      <span>
        Exploration mode — this session doesn't advance your Readiness Score.
      </span>
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
            // Silent swallow previously: a failed DELETE (500, network
            // error) left `status='active'` server-side, even though the
            // client UI reset to setup. POST /api/study/session auto-
            // abandons prior active sessions on the next start so this is
            // self-healing, but in the meantime the zombie shows up in
            // history and the "why did Abandon silently fail" signal was
            // invisible. Log + continue — a failed abandon shouldn't block
            // the user from leaving the study flow, but ops should still
            // see the failure.
            try {
              const abandonRes = await fetch('/api/study/session', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: sessionIdRef.current }),
              })
              if (!abandonRes.ok) {
                console.warn(
                  'StudySession abandon DELETE failed',
                  { status: abandonRes.status, sessionId: sessionIdRef.current }
                )
              }
            } catch (err) {
              console.warn('StudySession abandon DELETE network error', err)
            }
            dispatch({ type: 'RESET' })
          }}
        />
        {explorationBanner}
        <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-2xl">
            <QuestionCard key={state.question.id} question={state.question} onAnswer={submitAnswer} timeLimitSec={timeLimitSec} />
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
