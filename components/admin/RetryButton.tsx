'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function RetryButton({ documentId }: { documentId: string }) {
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle')
  // Previously the server's structured error body was thrown away — any
  // failure collapsed to a single "✗ error" chip. After PR #47 the retry
  // endpoint distinguishes three real failure modes (500 "Failed to load
  // document" on DB/RLS hiccup, 404 "Document not found" for stale rows,
  // 500 with raw Supabase message on the status reset) and the admin UI
  // surfaced none of them. An admin poking at a broken document had no
  // way to tell "try again in a minute" (DB blip) from "this row really
  // is gone" (deleted by GDPR purge) from "401 your admin session
  // expired" — all three looked identical.
  //
  // Parse the body, prefer message/error, and show the text as a title
  // tooltip (keeps the chip compact) plus log to console for ops support.
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handle = async () => {
    setStatus('idle')
    setErrMsg(null)
    try {
      const res = await fetch('/api/admin/actions/retry-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
        const msg = j.message ?? j.error ?? `HTTP ${res.status}`
        console.error('RetryButton retry failed', { documentId, status: res.status, msg })
        setErrMsg(msg)
        setStatus('err')
        return
      }
      setStatus('ok')
      startTransition(() => router.refresh())
    } catch (err) {
      console.error('RetryButton network error', { documentId, err })
      setErrMsg(err instanceof Error ? err.message : 'Network error')
      setStatus('err')
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={isPending}
      title={status === 'err' && errMsg ? errMsg : undefined}
      className="text-xs px-2 py-1 rounded border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors disabled:opacity-50"
    >
      {isPending ? '…' : status === 'ok' ? '✓ queued' : status === 'err' ? `✗ ${errMsg ?? 'error'}` : 'Retry'}
    </button>
  )
}
