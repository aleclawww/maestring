'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface ExamItem {
  position: number
  user_answer_index: number | null
  flagged: boolean
  answered_at: string | null
  is_correct: boolean | null
  question: {
    id: string
    question_text: string
    options: string[]
    difficulty: string
    concept_slug: string | null
    concept_name: string | null
    domain_slug: string | null
    domain_name: string | null
    correct_index: number | null
    explanation: string | null
  }
}

interface ExamSession {
  id: string
  status: 'in_progress' | 'submitted' | 'abandoned'
  started_at: string
  deadline_at: string
  total_questions: number
}

export default function ExamRunnerPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [session, setSession] = useState<ExamSession | null>(null)
  const [items, setItems] = useState<ExamItem[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const submittedRef = useRef(false)

  const submitExam = useCallback(async () => {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitting(true)
    await fetch(`/api/exam/${params.id}/submit`, { method: 'POST' })
    router.push(`/exam/${params.id}/results`)
  }, [params.id, router])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch(`/api/exam/${params.id}`)
      const json = await res.json()
      if (cancelled) return
      if (!res.ok) {
        setLoadError(json.error ?? 'No se pudo cargar')
        return
      }
      if (json.data.session.status !== 'in_progress') {
        router.replace(`/exam/${params.id}/results`)
        return
      }
      setSession(json.data.session)
      setItems(json.data.items)
      const firstUnanswered = json.data.items.findIndex((it: ExamItem) => it.user_answer_index === null)
      setCurrentIdx(firstUnanswered === -1 ? 0 : firstUnanswered)
    })()
    return () => {
      cancelled = true
    }
  }, [params.id, router])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const deadlineMs = session ? new Date(session.deadline_at).getTime() : 0
  const secondsLeft = Math.max(0, Math.floor((deadlineMs - now) / 1000))

  useEffect(() => {
    if (!session) return
    if (secondsLeft === 0 && !submittedRef.current) {
      void submitExam()
    }
  }, [secondsLeft, session, submitExam])

  const current = items[currentIdx]

  async function persistAnswer(position: number, answerIndex: number | null, flagged: boolean) {
    await fetch(`/api/exam/${params.id}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position, answerIndex, flagged }),
    })
  }

  function selectAnswer(answerIndex: number) {
    if (!current) return
    const pos = current.position
    setItems((prev) =>
      prev.map((it) =>
        it.position === pos ? { ...it, user_answer_index: answerIndex, answered_at: new Date().toISOString() } : it
      )
    )
    void persistAnswer(pos, answerIndex, current.flagged)
  }

  function toggleFlag() {
    if (!current) return
    const pos = current.position
    const newFlag = !current.flagged
    setItems((prev) => prev.map((it) => (it.position === pos ? { ...it, flagged: newFlag } : it)))
    void persistAnswer(pos, current.user_answer_index, newFlag)
  }

  if (loadError) {
    return (
      <div className="p-10 text-center">
        <p className="text-danger mb-4">{loadError}</p>
        <a href="/exam" className="btn-primary">Volver</a>
      </div>
    )
  }

  if (!session || !current) {
    return (
      <div className="p-10 text-center text-text-muted">Cargando simulacro…</div>
    )
  }

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const isLowTime = secondsLeft < 600
  const answeredCount = items.filter((it) => it.user_answer_index !== null).length

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          'flex items-center justify-between border-b px-6 py-3 transition-colors',
          isLowTime ? 'border-danger/30 bg-danger/5' : 'border-border bg-surface'
        )}
      >
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-text-secondary">
            Pregunta {currentIdx + 1} / {items.length}
          </span>
          <span className="text-xs text-text-muted">{answeredCount} respondidas</span>
        </div>
        <div
          className={cn(
            'flex items-center gap-2 font-mono text-lg font-bold',
            isLowTime ? 'text-danger animate-pulse' : 'text-text-primary'
          )}
        >
          ⏱️ {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </div>
        <button
          onClick={() => {
            if (confirm(`¿Enviar examen? Has respondido ${answeredCount}/${items.length} preguntas.`)) {
              void submitExam()
            }
          }}
          disabled={submitting}
          className="btn-danger text-sm"
        >
          {submitting ? 'Enviando…' : 'Enviar'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-text-muted">
                {current.question.domain_name ?? 'Dominio'}
              </span>
              <button
                onClick={toggleFlag}
                className={cn(
                  'text-xs px-2 py-0.5 rounded border transition-colors',
                  current.flagged
                    ? 'border-warning/50 bg-warning/10 text-warning'
                    : 'border-border text-text-muted hover:border-warning/50'
                )}
              >
                {current.flagged ? '🚩 Marcada' : '⚑ Marcar'}
              </button>
            </div>
            <p className="text-base text-text-primary leading-relaxed mb-6 whitespace-pre-wrap">
              {current.question.question_text}
            </p>
            <div className="space-y-3">
              {current.question.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => selectAnswer(i)}
                  className={cn(
                    'w-full text-left rounded-xl border px-4 py-3 text-sm transition-all',
                    current.user_answer_index === i
                      ? 'border-primary bg-primary/10 text-text-primary'
                      : 'border-border text-text-secondary hover:border-primary/50 hover:bg-primary/5'
                  )}
                >
                  <span className="flex items-start gap-3">
                    <span
                      className={cn(
                        'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                        current.user_answer_index === i
                          ? 'border-primary bg-primary text-white'
                          : 'border-border'
                      )}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => i - 1)}
                className="btn-outline flex-1 disabled:opacity-40"
              >
                ← Anterior
              </button>
              <button
                disabled={currentIdx === items.length - 1}
                onClick={() => setCurrentIdx((i) => i + 1)}
                className="btn-primary flex-1 disabled:opacity-40"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex w-56 flex-col border-l border-border bg-surface overflow-y-auto p-4">
          <p className="text-xs font-semibold text-text-muted mb-3 uppercase tracking-wide">
            Navegación
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {items.map((it, i) => (
              <button
                key={it.position}
                onClick={() => setCurrentIdx(i)}
                className={cn(
                  'h-8 w-8 rounded-md text-xs font-semibold transition-colors',
                  i === currentIdx
                    ? 'bg-primary text-white'
                    : it.flagged
                    ? 'bg-warning/20 text-warning border border-warning/30'
                    : it.user_answer_index !== null
                    ? 'bg-success/20 text-success'
                    : 'bg-surface-2 text-text-muted hover:bg-surface-2/80'
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-2 text-xs text-text-muted">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-success/20" /> Respondida
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-warning/20" /> Marcada
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-surface-2" /> Sin responder
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
