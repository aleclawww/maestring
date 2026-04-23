'use client'

import { useState } from 'react'

type Existing = {
  status: 'pending' | 'approved' | 'rejected'
  content: string
  display_name: string
  role: string | null
} | null

export function TestimonialForm({ existing, defaultName }: { existing: Existing; defaultName: string }) {
  const [displayName, setDisplayName] = useState(existing?.display_name ?? defaultName)
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
    const json = await res.json()
    setSending(false)
    if (!res.ok) {
      setError(json.message ?? json.error ?? 'Error')
      return
    }
    setDone('pending')
  }

  if (done) {
    return (
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold mb-2">Testimonial</h2>
        <div className="rounded-lg bg-surface-2 p-3 text-sm text-text-secondary">
          {done === 'approved' && '✅ Your testimonial is published on the landing page. Thank you!'}
          {done === 'pending' && '⏳ Testimonial submitted. We review each one manually within 24-48h.'}
          {done === 'rejected' && '❌ Testimonial not approved. If you think this is a mistake, reach out.'}
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="font-semibold mb-1">Share a testimonial</h2>
      <p className="text-xs text-text-muted mb-4">
        If you've passed the exam (or see real progress), your quote may appear on the landing page. We review each submission.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-muted">Public name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={60}
              className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
              placeholder="Sofia M."
              required
            />
          </div>
          <div>
            <label className="text-xs text-text-muted">Role (optional)</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              maxLength={60}
              className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
              placeholder="Cloud Engineer"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-text-muted">
            Testimonial <span className={tooLong ? 'text-danger' : 'text-text-muted'}>({remaining})</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            maxLength={520}
            className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
            placeholder="What made the difference with Maestring, how it changed the way you study, etc. Minimum 20 characters."
            required
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-text-muted">Stars</label>
          <select
            value={stars}
            onChange={(e) => setStars(Number(e.target.value))}
            className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-sm"
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {'★'.repeat(n)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={examPassed}
              onChange={(e) => setExamPassed(e.target.checked)}
            />
            I already passed the real exam
          </label>
          {examPassed && (
            <input
              type="number"
              placeholder="Scaled (720-1000)"
              min={720}
              max={1000}
              value={scaledScore}
              onChange={(e) => setScaledScore(e.target.value)}
              className="w-36 rounded-lg border border-border bg-surface-2 px-2 py-1 text-sm"
            />
          )}
        </div>
        {error && <div className="text-sm text-danger">{error}</div>}
        <button
          type="submit"
          disabled={sending || tooShort || tooLong}
          className="btn-primary text-sm disabled:opacity-40"
        >
          {sending ? 'Submitting…' : 'Submit for review'}
        </button>
      </form>
    </section>
  )
}
