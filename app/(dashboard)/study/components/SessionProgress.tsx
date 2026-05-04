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
    <div className="sticky top-0 z-10 -mx-4 border-b border-v2-border bg-v2-background/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-v2-mono text-[11px] uppercase tracking-v2-wide text-v2-foreground-subtle">
          Question {current} of {total}
        </span>
        <div className="flex items-center gap-3">
          <span className="font-v2-mono text-[11px] font-semibold text-v2-foreground-muted">
            {progress}%
          </span>
          {onAbandon && !confirmingAbandon && (
            <button
              onClick={() => setConfirmingAbandon(true)}
              className="text-[11px] font-medium text-v2-foreground-muted transition-colors hover:text-v2-error"
            >
              Abandon
            </button>
          )}
          {onAbandon && confirmingAbandon && (
            <span className="flex items-center gap-2 text-[11px]">
              <span className="text-v2-foreground-muted">Abandon session?</span>
              <button
                onClick={() => {
                  setConfirmingAbandon(false)
                  onAbandon()
                }}
                className="font-bold text-v2-error hover:underline"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmingAbandon(false)}
                className="text-v2-foreground-muted hover:text-v2-foreground"
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
        className="mb-2 h-1.5 overflow-hidden rounded-full bg-v2-surface-sunken"
      >
        <div
          className="h-full rounded-full bg-v2-gradient-brand transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Dots for answered questions */}
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i < answered.length
                ? answered[i]
                  ? 'bg-v2-success'
                  : 'bg-v2-error'
                : i === current - 1
                  ? 'bg-v2-foreground'
                  : 'bg-v2-surface-sunken',
            )}
          />
        ))}
      </div>
    </div>
  )
}
