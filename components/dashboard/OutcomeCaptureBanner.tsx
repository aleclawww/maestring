'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { track } from '@/lib/analytics'

// Pilar 7 — Flywheel de outcomes. La pantalla aparece cuando la fecha del examen
// ya pasó pero todavía no registramos resultado. Sin estos datos el clasificador
// P(aprobar) del Pilar 1 no madura, así que el copy explica el porqué — el
// usuario contribuye al sistema, no rellena un formulario por rellenarlo.
export function OutcomeCaptureBanner({ examDate }: { examDate: string }) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [scoreOpen, setScoreOpen] = useState(false)
  const [score, setScore] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async (outcome: 'passed' | 'failed' | 'unknown', includeScore = false) => {
    setSubmitting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = { outcome }
      if (includeScore && score) {
        const n = parseInt(score, 10)
        if (Number.isFinite(n) && n >= 100 && n <= 1000) body['scaled_score'] = n
      }
      const res = await fetch('/api/profile/exam-outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      // Previously: `if (!res.ok) throw new Error('Failed')` threw into the
      // bare `catch { setError("We couldn't save your result. Try again.") }`
      // below, which discarded EVERY structured server error — a 400
      // "Invalid payload" (bad score range), a 401 (session expired mid-exam
      // week), a 429 if we ever rate-limit this, and the 500 "Update failed"
      // from the Supabase write all collapsed into one generic "try again"
      // — which a user with a truly invalid score (e.g. pasted "7800")
      // kept retrying forever. Surface the server's error body so the
      // banner tells the user what to actually fix.
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
        setError(j.message ?? j.error ?? `Couldn't save result (HTTP ${res.status}). Try again.`)
        setSubmitting(false)
        return
      }
      track({
        name: 'outcome_captured',
        properties: {
          outcome,
          scaled_score: includeScore && score ? parseInt(score, 10) : null,
        },
      })
      router.refresh()
    } catch (err) {
      console.error('OutcomeCaptureBanner network error', err)
      setError("Network error while saving. Check your connection and try again.")
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-surface to-surface p-6 shadow-card">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-2xl">
          🎓
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-text-primary">
            How did the exam go?
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Your target date was {new Date(examDate).toLocaleDateString('en-US')}.
            Logging your result trains the model that predicts readiness for future
            students — and tunes yours if you come back for SAP-C02 or DVA-C02.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => submit('passed')}
              disabled={submitting}
              className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white hover:bg-success/90 disabled:opacity-50"
            >
              ✅ I passed
            </button>
            <button
              onClick={() => submit('failed')}
              disabled={submitting}
              className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-sm font-semibold text-warning hover:bg-warning/20 disabled:opacity-50"
            >
              🔁 Didn't pass this time
            </button>
            <button
              onClick={() => submit('unknown')}
              disabled={submitting}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface-2 disabled:opacity-50"
            >
              Prefer not to say
            </button>
          </div>

          <button
            onClick={() => setScoreOpen(v => !v)}
            className="mt-3 text-xs text-primary hover:underline"
          >
            {scoreOpen ? '— hide score' : '+ add score (optional, 100–1000)'}
          </button>
          {scoreOpen && (
            <div className="mt-2 flex gap-2">
              <input
                type="number"
                min={100}
                max={1000}
                value={score}
                onChange={e => setScore(e.target.value)}
                placeholder="e.g. 780"
                className="w-32 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none"
              />
              <button
                onClick={() => submit('passed', true)}
                disabled={submitting || !score}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
              >
                Save with score
              </button>
            </div>
          )}

          {error && <p className="mt-2 text-xs text-warning">{error}</p>}
        </div>
      </div>
    </div>
  )
}
