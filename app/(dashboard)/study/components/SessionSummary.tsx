'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Check,
  RotateCcw,
  Sparkles,
  TrendingUp,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Card, Pill, Button } from '@/components/v2'
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

  const radius = 42
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - stats.accuracy)

  const ringColor =
    accuracy >= 80
      ? 'var(--v2-success)'
      : accuracy >= 60
        ? 'var(--v2-warning)'
        : 'var(--v2-error)'

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      {/* Confetti (CSS-based, only on great sessions) */}
      {showConfetti && (
        <div className="confetti-container" aria-hidden="true">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#4F46E5', '#7C3AED', '#10B981', '#F59E0B', '#A78BFA'][
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

      <Card padding="lg" tone="emphasized" className="w-full max-w-[480px] text-center sm:p-10">
        <Pill tone={isGreat ? 'gradient' : 'brand'} size="md" className="mx-auto">
          <Sparkles className="h-3 w-3" strokeWidth={2.5} />
          <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide">
            Session complete
          </span>
        </Pill>

        <h2 className="v2-display mt-5 text-[28px] sm:text-[32px]">
          {isGreat ? 'Great work.' : 'Session complete'}
        </h2>
        <p className="mt-2 text-[14px] text-v2-foreground-muted">
          {stats.correctCount} of {stats.totalQuestions} answers correct
        </p>

        {/* Score Ring */}
        <div className="relative mx-auto mt-8 h-36 w-36">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="var(--v2-surface-sunken)"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="v2-display text-[36px] leading-none text-v2-foreground">
              {accuracy}%
            </span>
            <span className="mt-1 font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
              accuracy
            </span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="mx-auto mt-8 grid max-w-[400px] grid-cols-3 gap-3">
          <StatBlock
            Icon={Check}
            tone="success"
            value={stats.correctCount.toString()}
            label="Correct"
          />
          <StatBlock
            Icon={X}
            tone="error"
            value={stats.incorrectCount.toString()}
            label="Incorrect"
          />
          <StatBlock
            Icon={Zap}
            tone="brand"
            value={`+${stats.xpEarned}`}
            label="XP"
          />
        </div>

        <div className="mt-8 flex flex-col gap-2">
          <Button onClick={onNewSession} size="lg">
            <RotateCcw className="h-4 w-4" strokeWidth={2.25} />
            New session
          </Button>
          <Link href="/progress">
            <Button variant="secondary" size="lg" className="w-full">
              <TrendingUp className="h-4 w-4" strokeWidth={2.25} />
              View my progress
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

function StatBlock({
  Icon,
  tone,
  value,
  label,
}: {
  Icon: LucideIcon
  tone: 'success' | 'error' | 'brand'
  value: string
  label: string
}) {
  const cls =
    tone === 'success'
      ? 'border-v2-success/20 bg-v2-success-soft text-v2-success'
      : tone === 'error'
        ? 'border-v2-error/20 bg-v2-error-soft text-v2-error'
        : 'border-v2-brand/20 bg-v2-brand-soft text-v2-brand'
  return (
    <div className={`rounded-xl border p-3 ${cls}`}>
      <Icon className="mx-auto h-4 w-4" strokeWidth={2.25} />
      <p className="mt-1.5 v2-display text-[24px] leading-none">{value}</p>
      <p className="mt-1 font-v2-mono text-[10px] uppercase tracking-v2-wide opacity-70">
        {label}
      </p>
    </div>
  )
}
