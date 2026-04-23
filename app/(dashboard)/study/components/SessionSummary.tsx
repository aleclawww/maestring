'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { SessionStats } from '@/types/study'

interface SessionSummaryProps {
  stats: SessionStats
  sessionId: string
  onNewSession: () => void
}

export function SessionSummary({ stats, onNewSession }: SessionSummaryProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const accuracy = Math.round(stats.accuracy * 100)
  const isGreat = accuracy >= 80

  useEffect(() => {
    if (isGreat) setShowConfetti(true)
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [isGreat])

  // SVG ring dimensions
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - stats.accuracy)

  return (
    <div className="flex min-h-full flex-col items-center justify-center p-6">
      {/* Confetti (CSS-based) */}
      {showConfetti && (
        <div className="confetti-container" aria-hidden="true">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][
                  Math.floor(Math.random() * 5)
                ],
                borderRadius: Math.random() > 0.5 ? '50%' : '0',
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <div className="w-full max-w-md text-center">
        <h1 className="mb-2 text-2xl font-bold text-text-primary">
          {isGreat ? 'Great work! 🎉' : 'Session complete'}
        </h1>
        <p className="mb-8 text-text-secondary">
          {stats.correctCount} of {stats.totalQuestions} answers correct
        </p>

        {/* Score Ring */}
        <div className="mx-auto mb-8 w-36 h-36 relative">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle
              cx="50" cy="50" r={radius}
              fill="none"
              stroke="#1e2535"
              strokeWidth="8"
            />
            <circle
              cx="50" cy="50" r={radius}
              fill="none"
              stroke={accuracy >= 80 ? '#10b981' : accuracy >= 60 ? '#f59e0b' : '#ef4444'}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="score-ring transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-text-primary">{accuracy}%</span>
            <span className="text-xs text-text-muted">accuracy</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-success/30 bg-success/10 p-3">
            <p className="text-2xl font-bold text-success">{stats.correctCount}</p>
            <p className="text-xs text-text-muted">Correct</p>
          </div>
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3">
            <p className="text-2xl font-bold text-danger">{stats.incorrectCount}</p>
            <p className="text-xs text-text-muted">Incorrect</p>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-3">
            <p className="text-2xl font-bold text-primary">+{stats.xpEarned}</p>
            <p className="text-xs text-text-muted">XP earned</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button onClick={onNewSession} className="btn-primary w-full">
            New session
          </button>
          <Link href="/progress" className="btn-outline w-full text-center">
            View my progress
          </Link>
        </div>
      </div>
    </div>
  )
}
