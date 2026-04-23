'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ExamIntroPage() {
  const router = useRouter()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    setStarting(true)
    setError(null)
    try {
      const res = await fetch('/api/exam/start', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.message ?? json.error ?? "Couldn't start the mock exam")
        setStarting(false)
        return
      }
      router.push(`/exam/${json.data.id}`)
    } catch {
      setError('Network error')
      setStarting(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-lg text-center">
        <div className="text-6xl mb-6">📝</div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">SAA-C03 mock exam</h1>
        <p className="text-text-secondary mb-8">
          A replica of the official exam under the same conditions.
        </p>
        <div className="grid grid-cols-3 gap-4 mb-8 text-center">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-2xl font-bold text-text-primary">65</p>
            <p className="text-xs text-text-muted">Questions</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-2xl font-bold text-text-primary">130</p>
            <p className="text-xs text-text-muted">Minutes</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-2xl font-bold text-text-primary">720</p>
            <p className="text-xs text-text-muted">Points to pass</p>
          </div>
        </div>
        <div className="mb-6 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning text-left">
          <p className="font-semibold mb-1">⚠️ Mock exam conditions</p>
          <ul className="text-xs text-warning/80 space-y-1 list-disc list-inside">
            <li>The timer is server-side: it doesn't pause on reload.</li>
            <li>The exam submits automatically when time runs out.</li>
            <li>You can flag questions to review later.</li>
          </ul>
        </div>
        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}
        <button
          onClick={start}
          disabled={starting}
          className="btn-primary w-full text-base py-3 disabled:opacity-50"
        >
          {starting ? 'Starting…' : '🚀 Start mock exam'}
        </button>
      </div>
    </div>
  )
}
