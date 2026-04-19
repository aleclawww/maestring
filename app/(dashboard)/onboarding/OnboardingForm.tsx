'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { track } from '@/lib/analytics'

interface Domain {
  id: string
  slug: string
  name: string
  description: string | null
  exam_weight_percent: number
}

type Background = 'developer' | 'sysadmin' | 'business' | 'student' | 'other'

const STEPS = ['Background', 'Examen', 'Calibración', 'Listo'] as const

const LEVEL_LABELS = [
  { v: 0, label: 'Cero', desc: 'Nunca lo he tocado' },
  { v: 1, label: 'Lo he visto', desc: 'Sé que existe, no lo he usado' },
  { v: 2, label: 'Básico', desc: 'Lo he usado en tutoriales' },
  { v: 3, label: 'Intermedio', desc: 'Lo uso en proyectos reales' },
  { v: 4, label: 'Avanzado', desc: 'Lo domino, podría enseñarlo' },
]

const BACKGROUNDS: Array<{ v: Background; label: string; hint: string }> = [
  { v: 'developer', label: 'Desarrollador', hint: 'Backend, frontend, full-stack' },
  { v: 'sysadmin', label: 'SysAdmin / DevOps', hint: 'Infra, redes, operaciones' },
  { v: 'business', label: 'Business / Producto', hint: 'PM, consultor, arquitecto de negocio' },
  { v: 'student', label: 'Estudiante', hint: 'Sin experiencia profesional aún' },
  { v: 'other', label: 'Otro', hint: '' },
]

export function OnboardingForm({ domains }: { domains: Domain[] }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [background, setBackground] = useState<Background>('developer')
  const [examTargetDate, setExamTargetDate] = useState('')
  const [studyMinutesPerDay, setStudyMinutesPerDay] = useState(30)
  const [selfLevels, setSelfLevels] = useState<Record<string, number>>(
    () => Object.fromEntries(domains.map(d => [d.slug, 1]))
  )

  const days = examTargetDate
    ? Math.ceil((new Date(examTargetDate).getTime() - Date.now()) / 86_400_000)
    : null
  const pace: 'sprint' | 'crucero' | null =
    days === null ? null : days <= 21 ? 'sprint' : 'crucero'

  async function submit() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding/calibrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificationId: 'aws-saa-c03',
          examTargetDate: examTargetDate || null,
          studyMinutesPerDay,
          background,
          selfLevels,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'No se pudo guardar la calibración')
      }
      track({
        name: 'onboarding_completed',
        properties: {
          exam_target_date: examTargetDate || undefined,
          minutes_per_day: studyMinutesPerDay,
        },
      })
      router.push('/dashboard')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="border-b border-border px-6 py-4">
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1.5 w-full rounded-full ${i <= step ? 'bg-primary' : 'bg-surface-2'}`} />
              <span className={`text-xs hidden sm:block ${i <= step ? 'text-primary' : 'text-text-muted'}`}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {step === 0 && (
          <div>
            <h2 className="text-lg font-bold text-text-primary mb-1">¿Cuál es tu background?</h2>
            <p className="text-sm text-text-secondary mb-5">
              Esto adapta el tono de las explicaciones — un developer recibe contexto técnico,
              un perfil de business recibe analogías conceptuales.
            </p>
            <div className="space-y-2">
              {BACKGROUNDS.map(b => (
                <label
                  key={b.v}
                  className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer ${
                    background === b.v ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="bg"
                    checked={background === b.v}
                    onChange={() => setBackground(b.v)}
                  />
                  <div>
                    <p className="font-semibold text-text-primary">{b.label}</p>
                    {b.hint && <p className="text-xs text-text-muted">{b.hint}</p>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold text-text-primary mb-1">¿Cuándo es tu examen?</h2>
            <p className="text-sm text-text-secondary mb-5">
              Calibramos el ritmo recomendado a partir de aquí.
            </p>
            <input
              type="date"
              value={examTargetDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setExamTargetDate(e.target.value)}
              className="input-field mb-3"
            />
            {pace && days !== null && (
              <div className={`text-sm rounded-lg px-3 py-2 mb-5 ${
                pace === 'sprint' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
              }`}>
                {days} días → modo <strong>{pace}</strong>
                {pace === 'sprint'
                  ? ': sesiones diarias, foco en dominios de alto peso.'
                  : ': 3-4 sesiones/semana, exploración amplia.'}
              </div>
            )}
            <label className="text-sm font-medium text-text-secondary mb-2 block">
              Minutos al día disponibles:
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[15, 30, 45, 60, 90, 120].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setStudyMinutesPerDay(m)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                    studyMinutesPerDay === m
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-text-secondary hover:border-primary/50'
                  }`}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold text-text-primary mb-1">Nivel autopercibido por dominio</h2>
            <p className="text-sm text-text-secondary mb-5">
              Sé honesto. Esto siembra tu modelo cognitivo — el sistema lo refinará con cada
              respuesta. Subestimar es mejor que sobreestimar.
            </p>
            <div className="space-y-4">
              {domains.map(d => (
                <div key={d.slug} className="rounded-lg border border-border p-3">
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <p className="font-semibold text-text-primary text-sm">{d.name}</p>
                    <span className="text-xs text-text-muted">{d.exam_weight_percent}% del examen</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {LEVEL_LABELS.map(l => (
                      <button
                        key={l.v}
                        type="button"
                        onClick={() => setSelfLevels(s => ({ ...s, [d.slug]: l.v }))}
                        className={`rounded px-1 py-2 text-xs font-medium ${
                          selfLevels[d.slug] === l.v
                            ? 'bg-primary text-white'
                            : 'bg-surface-2 text-text-secondary hover:bg-primary/20'
                        }`}
                        title={l.desc}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold text-text-primary mb-1">Contrato psicológico</h2>
            <p className="text-sm text-text-secondary mb-5">Antes de empezar, esto es importante:</p>
            <div className="rounded-xl border border-border bg-surface-2 p-4 mb-5 space-y-3 text-sm">
              <p className="text-text-primary">
                <strong>En Maestring, los errores no son problemas — son el mecanismo de aprendizaje.</strong>
              </p>
              <p className="text-text-secondary">
                Cada vez que falles una pregunta, el sistema aprende más sobre ti y ajusta tu plan.
                Vas a fallar preguntas. Eso es exactamente lo que tiene que pasar.
              </p>
              <p className="text-text-secondary">
                Tu Readiness Score empieza bajo y sube con repeticiones espaciadas — no con
                respuestas correctas seguidas. La consistencia gana, no la velocidad.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm space-y-1">
              <p>📅 Examen: <strong>{examTargetDate || 'sin fecha'}</strong>{days !== null && ` (${days}d)`}</p>
              <p>⏱️ Estudio diario: <strong>{studyMinutesPerDay} min</strong></p>
              <p>🎯 Background: <strong>{BACKGROUNDS.find(b => b.v === background)?.label}</strong></p>
              <p>📊 Conceptos a sembrar: <strong>{domains.length * 5}</strong></p>
            </div>
            {error && <p className="text-sm text-danger mt-3">{error}</p>}
          </div>
        )}

        <div className={`flex ${step > 0 ? 'justify-between' : 'justify-end'}`}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="btn-outline" disabled={loading}>
              ← Atrás
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} className="btn-primary">
              Continuar →
            </button>
          ) : (
            <button onClick={submit} disabled={loading} className="btn-primary">
              {loading ? 'Calibrando…' : 'Empezar a estudiar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
