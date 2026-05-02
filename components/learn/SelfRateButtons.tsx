'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

export function SelfRateButtons({ conceptSlug }: { conceptSlug: string }) {
  const [submitted, setSubmitted] = useState<null | 'know' | 'need_to_learn'>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function rate(rating: 'know' | 'need_to_learn') {
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to record')
    } finally {
      setPending(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-sm text-text-secondary">
        ✓ Recorded —{' '}
        {submitted === 'know'
          ? 'pushed to long-term review (next check in 14 days).'
          : 'queued for the front of your next session.'}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-text-secondary">Quick self-rating</p>
      <div className="flex gap-2">
        <Button variant="ghost" disabled={pending} onClick={() => rate('know')}>✅ I know this</Button>
        <Button variant="ghost" disabled={pending} onClick={() => rate('need_to_learn')}>📖 Need to learn</Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
