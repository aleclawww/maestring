'use client'

import { useState } from 'react'
import { BookOpen, Check } from 'lucide-react'
import { Button } from '@/components/v2'

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

  if (submitted) {
    const opposite: Rating = submitted === 'know' ? 'need_to_learn' : 'know'
    return (
      <div className="space-y-2">
        <p className="flex items-start gap-2 text-[14px] leading-[1.55] text-v2-foreground">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-v2-success-soft text-v2-success">
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
          <span>
            {submitted === 'know' ? (
              <>
                Marked as <strong>known</strong> — pushed to long-term review
                (next check in 14 days).
              </>
            ) : (
              <>
                Marked as <strong>needs work</strong> — queued for the front of
                your next session.
              </>
            )}
          </span>
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => rate(opposite)}
          className="text-[12px] font-medium text-v2-foreground-muted underline transition-colors hover:text-v2-foreground disabled:opacity-50"
        >
          Undo / change to "
          {opposite === 'know' ? 'I know this' : 'Need to learn'}"
        </button>
      </div>
    )
  }

  if (confirming) {
    return (
      <div className="space-y-3">
        <p className="text-[14px] leading-[1.55] text-v2-foreground">
          {confirming === 'know'
            ? 'Confirm you already know this? FSRS will skip it for 14 days.'
            : "Confirm this needs work? It'll jump to the front of your next session."}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={pending}
            loading={pending}
            onClick={() => rate(confirming)}
          >
            Yes, confirm
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => setConfirming(null)}
          >
            Cancel
          </Button>
        </div>
        {error && (
          <p
            role="alert"
            className="text-[12px] font-medium text-v2-error"
          >
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle">
        Quick self-rating
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => setConfirming('know')}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          I know this
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => setConfirming('need_to_learn')}
        >
          <BookOpen className="h-3.5 w-3.5" strokeWidth={2} />
          Need to learn
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-[12px] font-medium text-v2-error">
          {error}
        </p>
      )}
    </div>
  )
}
