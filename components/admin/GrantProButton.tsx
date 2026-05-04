'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function GrantProButton({ userId }: { userId: string }) {
  const [days, setDays] = useState(30)
  const [reason, setReason] = useState('launch_comp')
  const [isPending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  const handle = async () => {
    setErr(null)
    // Previously: no try/catch. A rejected fetch (offline, DNS blip, Vercel
    // 502 during deploy) bubbled as an unhandled promise rejection — no error
    // surfaced to the admin and Sentry/console never saw it. On an admin
    // granting Pro manually this is the worst case: the operator thinks it
    // worked (no error) and moves on, and the user never gets access.
    try {
      const res = await fetch('/api/admin/actions/grant-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, days, reason }),
      })
      const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
      if (!res.ok) {
        console.error('GrantProButton failed', { status: res.status, body: j, userId, days, reason })
        setErr(j.message ?? j.error ?? `Failed (HTTP ${res.status})`)
        return
      }
      startTransition(() => router.refresh())
    } catch (err) {
      console.error('GrantProButton network error', { err, userId, days, reason })
      setErr('Network error while granting Pro. Check your connection and try again.')
    }
  }

  return (
    <div className="rounded-lg border border-v2-border bg-v2-surface-subtle p-4 space-y-3">
      <p className="text-xs font-semibold">Grant Pro (manual)</p>
      <div className="flex items-center gap-2">
        <label className="text-xs text-v2-foreground-subtle">Days</label>
        <input
          type="number"
          value={days}
          onChange={e => setDays(Math.max(1, Number(e.target.value)))}
          className="w-20 bg-v2-surface border border-v2-border rounded px-2 py-1 text-xs"
        />
        <input
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="reason"
          className="flex-1 bg-v2-surface border border-v2-border rounded px-2 py-1 text-xs"
        />
        <button
          onClick={handle}
          disabled={isPending}
          className="inline-flex h-8 items-center justify-center rounded-lg bg-v2-gradient-brand px-3 text-[12px] font-semibold text-white shadow-v2-button transition-all hover:-translate-y-0.5 disabled:opacity-50"
        >
          {isPending ? '…' : 'Grant'}
        </button>
      </div>
      {err && <p className="text-xs text-v2-error">{err}</p>}
    </div>
  )
}
