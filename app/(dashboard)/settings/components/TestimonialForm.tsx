'use client'

import { useState } from 'react'
import { Check, Clock, Star, X } from 'lucide-react'
import { Card, Field, Input, Textarea, Button, Eyebrow } from '@/components/v2'

type Existing = {
  status: 'pending' | 'approved' | 'rejected'
  content: string
  display_name: string
  role: string | null
} | null

export function TestimonialForm({
  existing,
  defaultName,
}: {
  existing: Existing
  defaultName: string
}) {
  const [displayName, setDisplayName] = useState(
    existing?.display_name ?? defaultName,
  )
  const [role, setRole] = useState(existing?.role ?? '')
  const [content, setContent] = useState(existing?.content ?? '')
  const [stars, setStars] = useState(5)
  const [examPassed, setExamPassed] = useState(false)
  const [scaledScore, setScaledScore] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(existing?.status ?? null)
  const [error, setError] = useState<string | null>(null)

  const remaining = 500 - content.length
  const tooShort = content.trim().length < 20
  const tooLong = content.length > 500

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          role: role.trim() || null,
          content: content.trim(),
          stars,
          examPassed,
          scaledScore: scaledScore ? Number(scaledScore) : undefined,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        message?: string
        error?: string
      }
      if (!res.ok) {
        console.error('TestimonialForm submit failed', {
          status: res.status,
          body: json,
        })
        setError(
          json.message ??
            json.error ??
            `Couldn't submit (HTTP ${res.status}). Please try again.`,
        )
        return
      }
      setDone('pending')
    } catch (err) {
      console.error('TestimonialForm submit network error', err)
      setError('Network error. Check your connection and try again.')
    } finally {
      setSending(false)
    }
  }

  if (done) {
    const tone =
      done === 'approved'
        ? { Icon: Check, color: 'text-v2-success', bg: 'bg-v2-success-soft' }
        : done === 'pending'
          ? { Icon: Clock, color: 'text-v2-warning', bg: 'bg-v2-warning-soft' }
          : { Icon: X, color: 'text-v2-error', bg: 'bg-v2-error-soft' }
    const message =
      done === 'approved'
        ? 'Your testimonial is published on the landing page. Thank you!'
        : done === 'pending'
          ? 'Testimonial submitted. We review each one manually within 24-48h.'
          : 'Testimonial not approved. If you think this is a mistake, reach out.'
    return (
      <section>
        <Eyebrow>Testimonial</Eyebrow>
        <Card padding="lg" className="mt-3">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone.bg} ${tone.color}`}
            >
              <tone.Icon className="h-4 w-4" strokeWidth={2.25} />
            </div>
            <p className="text-[14px] leading-[1.6] text-v2-foreground">
              {message}
            </p>
          </div>
        </Card>
      </section>
    )
  }

  return (
    <section>
      <Eyebrow>Testimonial</Eyebrow>
      <Card padding="lg" className="mt-3 space-y-5">
        <p className="text-[13px] leading-[1.55] text-v2-foreground-muted">
          If you've passed the exam (or see real progress), your quote may
          appear on the landing page. We review each submission within 24–48h.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Public name" htmlFor="testimonial-name" required>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={60}
                placeholder="Sofia M."
                required
              />
            </Field>
            <Field label="Role" htmlFor="testimonial-role" hint="Optional">
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                maxLength={60}
                placeholder="Cloud Engineer"
              />
            </Field>
          </div>

          <Field
            label="Testimonial"
            htmlFor="testimonial-content"
            required
            hint={`${remaining} characters remaining · 20 minimum`}
          >
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              maxLength={520}
              placeholder="What made the difference with Maestring, how it changed the way you study…"
              required
              invalid={tooLong}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Rating" htmlFor="testimonial-stars">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setStars(n)}
                    aria-label={`${n} stars`}
                    className="rounded-md p-1 transition-colors hover:bg-v2-surface-subtle"
                  >
                    <Star
                      className={`h-5 w-5 ${
                        n <= stars
                          ? 'fill-v2-warning text-v2-warning'
                          : 'fill-transparent text-v2-foreground-subtle'
                      }`}
                      strokeWidth={1.75}
                    />
                  </button>
                ))}
              </div>
            </Field>

            <div>
              <label className="mt-2 flex cursor-pointer items-start gap-2.5 rounded-lg border border-v2-border bg-v2-surface-subtle/50 p-3">
                <input
                  type="checkbox"
                  checked={examPassed}
                  onChange={(e) => setExamPassed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-v2-border text-v2-brand accent-v2-brand"
                />
                <span className="text-[12px] leading-[1.5] text-v2-foreground">
                  I already passed the real exam
                </span>
              </label>
              {examPassed && (
                <Input
                  type="number"
                  placeholder="Scaled score (720–1000)"
                  min={720}
                  max={1000}
                  value={scaledScore}
                  onChange={(e) => setScaledScore(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-v2-error/30 bg-v2-error-soft px-3 py-2 text-[13px] text-v2-error"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={sending || tooShort || tooLong}
            loading={sending}
          >
            {sending ? 'Submitting…' : 'Submit for review'}
          </Button>
        </form>
      </Card>
    </section>
  )
}
