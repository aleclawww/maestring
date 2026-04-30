'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface SessionProgressProps {
  current: number
  total: number
  answered?: boolean[]
  onAbandon?: () => void
  elapsedSeconds?: number
}

export function SessionProgress({
  current,
  total,
  answered = [],
  onAbandon,
}: SessionProgressProps) {
  const [confirmingAbandon, setConfirmingAbandon] = useState(false)
  const progress = Math.round((current / total) * 100)

  return (
    <div className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur-sm px-6 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-muted">
          Question {current} of {total}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">{progress}%</span>
          {onAbandon && !confirmingAbandon && (
            <button
              onClick={() => setConfirmingAbandon(true)}
              className="text-xs text-text-muted hover:text-danger transition-colors"
            >
              Abandon
            </button>
          )}
          {onAbandon && confirmingAbandon && (
            <span className="flex items-center gap-2 text-xs">
              <span className="text-text-muted">Abandon session?</span>
              <button
                onClick={() => { setConfirmingAbandon(false); onAbandon() }}
                className="text-danger font-semibold hover:underline"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmingAbandon(false)}
                className="text-text-muted hover:text-text-primary"
              >
                Cancel
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Session progress: ${progress}%`}
        className="h-1.5 rounded-full bg-surface-2 overflow-hidden mb-2"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Dots for answered questions */}
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              i < answered.length
                ? answered[i]
                  ? 'bg-success'
                  : 'bg-danger'
                : i === current - 1
                ? 'bg-primary'
                : 'bg-surface-2'
            )}
          />
        ))}
      </div>
    </div>
  )
}
