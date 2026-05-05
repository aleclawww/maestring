'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, GraduationCap, RotateCcw, X } from 'lucide-react'
import { Card, Button, Input } from '@/components/v2'
import { track } from '@/lib/analytics'

// Pilar 7 — outcome flywheel. Shown when the exam date has passed but no
// result has been logged. Without these data points the P(pass) classifier
// from Pilar 1 doesn't mature, so the copy explains why — the user is
// contributing to the system, not filling out a form.
export function OutcomeCaptureBanner({ examDate }: { examDate: string }) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [scoreOpen, setScoreOpen] = useState(false)
  const [score, setScore] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async (
    outcome: 'passed' | 'failed' | 'unknown',
    includeScore = false,
  ) => {
    setSubmitting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = { outcome }
      if (includeScore && score) {
        const n = parseInt(score, 10)
        if (Number.isFinite(n) && n >= 100 && n <= 1000)
          body['scaled_score'] = n
      }
      const res = await fetch('/api/profile/exam-outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as {
          error?: string
          message?: string
        }
        setError(
          j.message ??
            j.error ??
            `Couldn't save result (HTTP ${res.status}). Try again.`,
        )
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
      setError(
        'Network error while saving. Check your connection and try again.',
      )
      setSubmitting(false)
    }
  }

  return (
    <Card padding="lg" tone="emphasized" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full opacity-50 blur-3xl"
        style={{ background: 'var(--v2-gradient-brand-soft)' }}
      />

      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-v2-gradient-brand text-white shadow-v2-button">
          <GraduationCap className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[18px] font-bold text-v2-foreground">
            How did the exam go?
          </h2>
          <p className="mt-1 text-[14px] leading-[1.6] text-v2-foreground-muted">
            Your target date was{' '}
            {new Date(examDate).toLocaleDateString('en-US')}. Logging your
            result trains the readiness model for future students — and tunes
            yours if you come back for SAP-C02 or DVA-C02.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => submit('passed')}
              disabled={submitting}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-v2-success px-4 text-[13px] font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              I passed
            </button>
            <button
              onClick={() => submit('failed')}
              disabled={submitting}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-v2-warning/40 bg-v2-warning-soft px-4 text-[13px] font-semibold text-v2-warning transition-colors hover:bg-v2-warning-soft/80 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.25} />
              Didn't pass this time
            </button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => submit('unknown')}
              disabled={submitting}
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.25} />
              Prefer not to say
            </Button>
          </div>

          <button
            onClick={() => setScoreOpen((v) => !v)}
            className="mt-3 text-[12px] font-semibold text-v2-brand hover:text-v2-brand-hover"
          >
            {scoreOpen
              ? '— hide score'
              : '+ add score (optional, 100–1000)'}
          </button>
          {scoreOpen && (
            <div className="mt-2 flex flex-wrap gap-2">
              <Input
                type="number"
                min={100}
                max={1000}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="e.g. 780"
                className="w-36"
              />
              <Button
                size="sm"
                onClick={() => submit('passed', true)}
                disabled={submitting || !score}
              >
                Save with score
              </Button>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="mt-2 text-[12px] font-medium text-v2-warning"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
