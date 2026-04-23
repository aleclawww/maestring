'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function RetryButton({ documentId }: { documentId: string }) {
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handle = async () => {
    setStatus('idle')
    const res = await fetch('/api/admin/actions/retry-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId }),
    })
    if (!res.ok) {
      setStatus('err')
      return
    }
    setStatus('ok')
    startTransition(() => router.refresh())
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={isPending}
      className="text-xs px-2 py-1 rounded border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors disabled:opacity-50"
    >
      {isPending ? '…' : status === 'ok' ? '✓ queued' : status === 'err' ? '✗ error' : 'Retry'}
    </button>
  )
}
