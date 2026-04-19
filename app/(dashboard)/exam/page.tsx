'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'

// We need client-side for timer, so this is a client component
// The metadata is set elsewhere

const TOTAL_QUESTIONS = 65
const EXAM_MINUTES = 130
const PASSING_SCORE = 720
const MAX_SCORE = 1000

interface ExamQuestion {
  id: number
  domain: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  difficulty: number
}

// Sample questions (in real app, loaded from API)
const generateSampleQuestions = (): ExamQuestion[] => {
  const domains = [
    'Arquitectura Resiliente',
    'Alto Rendimiento',
    'Seguridad',
    'Costo Optimizado',
  ]
  return Array.from({ length: TOTAL_QUESTIONS }, (_, i) => ({
    id: i + 1,
    domain: domains[i % 4] ?? 'Arquitectura Resiliente',
    question: `Pregunta de simulacro #${i + 1}: Una empresa necesita implementar una solución AWS que cumpla con los requisitos de ${domains[i % 4]}. ¿Cuál es la mejor arquitectura?`,
    options: ['Opción A: Solución sencilla', 'Opción B: Multi-región', 'Opción C: HA con failover', 'Opción D: Edge optimized'],
    correctIndex: Math.floor(Math.random() * 4),
    explanation: `La respuesta correcta considera los principios de ${domains[i % 4]}.`,
    difficulty: 0.5 + (i % 3) * 0.2,
  }))
}

type ExamPhase = 'intro' | 'exam' | 'results'

export default function ExamPage() {
  const [phase, setPhase] = useState<ExamPhase>('intro')
  const [questions] = useState<ExamQuestion[]>(() => generateSampleQuestions())
  const [answers, setAnswers] = useState<(number | null)[]>(Array(TOTAL_QUESTIONS).fill(null))
  const [flagged, setFlagged] = useState<boolean[]>(Array(TOTAL_QUESTIONS).fill(false))
  const [currentQ, setCurrentQ] = useState(0)
  const [timeLeft, setTimeLeft] = useState(EXAM_MINUTES * 60)
  const [submitted, setSubmitted] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const submitExam = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setSubmitted(true)
    setPhase('results')
  }, [])

  useEffect(() => {
    if (phase !== 'exam') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          submitExam()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase, submitExam])

  const toggleFlag = (i: number) => {
    setFlagged(f => f.map((v, idx) => idx === i ? !v : v))
  }

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const isLowTime = timeLeft < 600 // < 10 minutes

  // ---- INTRO ----
  if (phase === 'intro') {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <div className="w-full max-w-lg text-center">
          <div className="text-6xl mb-6">📝</div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Simulacro SAA-C03</h1>
          <p className="text-text-secondary mb-8">
            Réplica del examen oficial con las mismas condiciones.
          </p>
          <div className="grid grid-cols-3 gap-4 mb-8 text-center">
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-2xl font-bold text-text-primary">65</p>
              <p className="text-xs text-text-muted">Preguntas</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-2xl font-bold text-text-primary">130</p>
              <p className="text-xs text-text-muted">Minutos</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-2xl font-bold text-text-primary">720</p>
              <p className="text-xs text-text-muted">Puntos para aprobar</p>
            </div>
          </div>
          <div className="mb-8 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning text-left">
            <p className="font-semibold mb-1">⚠️ Condiciones del simulacro</p>
            <ul className="text-xs text-warning/80 space-y-1 list-disc list-inside">
              <li>No puedes pausar el cronómetro</li>
              <li>El examen se envía automáticamente al agotar el tiempo</li>
              <li>Puedes marcar preguntas para revisar</li>
            </ul>
          </div>
          <button
            onClick={() => setPhase('exam')}
            className="btn-primary w-full text-base py-3"
          >
            🚀 Comenzar simulacro
          </button>
        </div>
      </div>
    )
  }

  // ---- EXAM ----
  if (phase === 'exam') {
    const q = questions[currentQ]
    if (!q) return null
    const answeredCount = answers.filter(a => a !== null).length

    return (
      <div className="flex h-full flex-col">
        {/* Top bar */}
        <div className={cn(
          'flex items-center justify-between border-b px-6 py-3 transition-colors',
          isLowTime ? 'border-danger/30 bg-danger/5' : 'border-border bg-surface'
        )}>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-text-secondary">
              Pregunta {currentQ + 1} / {TOTAL_QUESTIONS}
            </span>
            <span className="text-xs text-text-muted">{answeredCount} respondidas</span>
          </div>
          <div className={cn(
            'flex items-center gap-2 font-mono text-lg font-bold',
            isLowTime ? 'text-danger animate-pulse' : 'text-text-primary'
          )}>
            ⏱️ {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>
          <button
            onClick={() => {
              if (confirm(`¿Enviar examen? Has respondido ${answeredCount}/${TOTAL_QUESTIONS} preguntas.`)) {
                submitExam()
              }
            }}
            className="btn-danger text-sm"
          >
            Enviar
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Question panel */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-text-muted">{q.domain}</span>
                <button
                  onClick={() => toggleFlag(currentQ)}
                  className={cn(
                    'text-xs px-2 py-0.5 rounded border transition-colors',
                    flagged[currentQ]
                      ? 'border-warning/50 bg-warning/10 text-warning'
                      : 'border-border text-text-muted hover:border-warning/50'
                  )}
                >
                  {flagged[currentQ] ? '🚩 Marcada' : '⚑ Marcar'}
                </button>
              </div>
              <p className="text-base text-text-primary leading-relaxed mb-6">{q.question}</p>
              <div className="space-y-3">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setAnswers(a => a.map((v, idx) => idx === currentQ ? i : v))}
                    className={cn(
                      'w-full text-left rounded-xl border px-4 py-3 text-sm transition-all',
                      answers[currentQ] === i
                        ? 'border-primary bg-primary/10 text-text-primary'
                        : 'border-border text-text-secondary hover:border-primary/50 hover:bg-primary/5'
                    )}
                  >
                    <span className="flex items-start gap-3">
                      <span className={cn(
                        'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                        answers[currentQ] === i ? 'border-primary bg-primary text-white' : 'border-border'
                      )}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  disabled={currentQ === 0}
                  onClick={() => setCurrentQ(q => q - 1)}
                  className="btn-outline flex-1 disabled:opacity-40"
                >
                  ← Anterior
                </button>
                <button
                  disabled={currentQ === TOTAL_QUESTIONS - 1}
                  onClick={() => setCurrentQ(q => q + 1)}
                  className="btn-primary flex-1 disabled:opacity-40"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          </div>

          {/* Right panel: question grid */}
          <div className="hidden lg:flex w-56 flex-col border-l border-border bg-surface overflow-y-auto p-4">
            <p className="text-xs font-semibold text-text-muted mb-3 uppercase tracking-wide">
              Navegación
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQ(i)}
                  className={cn(
                    'h-8 w-8 rounded-md text-xs font-semibold transition-colors',
                    i === currentQ
                      ? 'bg-primary text-white'
                      : flagged[i]
                      ? 'bg-warning/20 text-warning border border-warning/30'
                      : answers[i] !== null
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

  // ---- RESULTS ----
  if (phase === 'results') {
    const correct = questions.reduce((sum, q, i) => sum + (answers[i] === q.correctIndex ? 1 : 0), 0)
    const accuracy = correct / TOTAL_QUESTIONS
    const scaledScore = Math.round(100 + accuracy * 900)
    const passed = scaledScore >= PASSING_SCORE

    // By domain
    const byDomain: Record<string, { correct: number; total: number }> = {}
    questions.forEach((q, i) => {
      if (!byDomain[q.domain]) byDomain[q.domain] = { correct: 0, total: 0 }
      const rec = byDomain[q.domain]
      if (rec) {
        rec.total++
        if (answers[i] === q.correctIndex) rec.correct++
      }
    })

    const circumference = 2 * Math.PI * 42
    const offset = circumference * (1 - accuracy)

    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            {passed ? '🎉 ¡Aprobado!' : '📚 Sigue practicando'}
          </h1>
          <p className="text-text-secondary">
            {passed
              ? 'Has superado el umbral de aprobación. ¡Excelente trabajo!'
              : 'No llegaste al mínimo esta vez. ¡Sigue estudiando!'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-8 mb-8">
          {/* Score gauge */}
          <div className="relative w-44 h-44">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#1e2535" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={passed ? '#10b981' : '#ef4444'}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-text-primary">{scaledScore}</span>
              <span className="text-xs text-text-muted">/ {MAX_SCORE}</span>
              <span className={cn('text-xs font-bold mt-1', passed ? 'text-success' : 'text-danger')}>
                {passed ? 'APROBADO' : 'REPROBADO'}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-surface p-3 text-center">
              <p className="text-2xl font-bold text-success">{correct}</p>
              <p className="text-xs text-text-muted">Correctas</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3 text-center">
              <p className="text-2xl font-bold text-danger">{TOTAL_QUESTIONS - correct}</p>
              <p className="text-xs text-text-muted">Incorrectas</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3 text-center">
              <p className="text-2xl font-bold text-text-primary">{Math.round(accuracy * 100)}%</p>
              <p className="text-xs text-text-muted">Precisión</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3 text-center">
              <p className={cn('text-2xl font-bold', passed ? 'text-success' : 'text-warning')}>
                {PASSING_SCORE}
              </p>
              <p className="text-xs text-text-muted">Umbral mínimo</p>
            </div>
          </div>
        </div>

        {/* By domain */}
        <div className="rounded-xl border border-border bg-surface p-6 mb-6">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Resultado por dominio</h2>
          <div className="space-y-3">
            {Object.entries(byDomain).map(([domain, { correct: c, total: t }]) => {
              const pct = Math.round((c / t) * 100)
              return (
                <div key={domain}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-secondary">{domain}</span>
                    <span className={pct >= 72 ? 'text-success' : 'text-danger'}>{pct}% ({c}/{t})</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', pct >= 72 ? 'bg-success' : 'bg-danger')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setPhase('intro')} className="btn-outline flex-1">
            Nuevo simulacro
          </button>
          <a href="/study" className="btn-primary flex-1 text-center">
            Seguir estudiando
          </a>
        </div>
      </div>
    )
  }

  return null
}
