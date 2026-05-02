'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

type Rating = 'know' | 'need_to_learn'

export function SelfRateButtons({ conceptSlug }: { conceptSlug: string }) {
  const [submitted, setSubmitted] = useState<Rating | null>(null)
  const [confirming, setConfirming] = useState<Rating | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function rate(rating: Rating) {
    setPending(true)
    setError(null)
    try {
      const res = await fetch('/api/learn/self-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptSlug, rating }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      setSubmitted(rating)
      setConfirming(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to record')
    } finally {
      setPending(false)
    }
  }

  // Submitted state: show what was recorded + an undo path (re-rate the
  // opposite, which the same endpoint handles idempotently).
  if (submitted) {
    const opposite: Rating = submitted === 'know' ? 'need_to_learn' : 'know'
    return (
      <div className="space-y-2">
        <p className="text-sm">
          ✓{' '}
          {submitted === 'know'
            ? <>Marked as <b>known</b> — pushed to long-term review (next check in 14 days).</>
            : <>Marked as <b>needs work</b> — queued for the front of your next session.</>}
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => rate(opposite)}
          className="text-xs text-text-secondary underline hover:text-text-primary disabled:opacity-50"
        >
          Undo / change to &ldquo;{opposite === 'know' ? 'I know this' : 'Need to learn'}&rdquo;
        </button>
      </div>
    )
  }

  // Confirmation step: clicking "I know this" doesn't fire immediately. Shows
  // a confirm/cancel pair so an accidental tap doesn't bump FSRS state to a
  // 14-day stability — easy to do on mobile.
  if (confirming) {
    return (
      <div className="space-y-2">
        <p className="text-sm">
          {confirming === 'know'
            ? "Confirm you already know this? FSRS will skip it for 14 days."
            : "Confirm this needs work? It'll jump to the front of your next session."}
        </p>
        <div className="flex gap-2">
          <Button disabled={pending} onClick={() => rate(confirming)}>Yes, confirm</Button>
          <Button variant="ghost" disabled={pending} onClick={() => setConfirming(null)}>Cancel</Button>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-text-secondary">Quick self-rating</p>
      <div className="flex gap-2">
        <Button variant="ghost" disabled={pending} onClick={() => setConfirming('know')}>✅ I know this</Button>
        <Button variant="ghost" disabled={pending} onClick={() => setConfirming('need_to_learn')}>📖 Need to learn</Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
