'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  Eye,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react'
import { Card, Button, Badge, Pill } from '@/components/v2'
import { DOMAINS } from '@/lib/knowledge-graph/aws-saa'
import type { Flashcard } from './page'

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

export function FlashcardDeck({
  cards: initial,
  filterLabel,
}: {
  cards: Flashcard[]
  filterLabel: string
}) {
  const [cards] = useState(() => shuffle(initial).slice(0, 50))
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [knew, setKnew] = useState(0)
  const [needsWork, setNeedsWork] = useState(0)

  const card = cards[idx]
  const total = cards.length
  const done = idx >= total

  const progressPct = useMemo(
    () => Math.round((idx / Math.max(total, 1)) * 100),
    [idx, total],
  )

  if (total === 0) {
    return (
      <Card padding="lg" className="mx-auto max-w-[480px] text-center">
        <h2 className="v2-display text-[24px]">No cards available</h2>
        <p className="mt-2 text-[14px] text-v2-foreground-muted">
          No flashcards could be built from this filter.
        </p>
        <Link href="/flashcards" className="mt-6 inline-block">
          <Button variant="secondary">
            <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
            Back to all cards
          </Button>
        </Link>
      </Card>
    )
  }

  if (done) {
    const accuracy = total > 0 ? Math.round((knew / total) * 100) : 0
    return (
      <div className="mx-auto max-w-[640px] space-y-6">
        <Card padding="lg" tone="emphasized" className="text-center sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-v2-gradient-brand text-white shadow-v2-button">
            <Sparkles className="h-6 w-6" strokeWidth={2} />
          </div>
          <Pill tone="brand" size="md" className="mx-auto mt-5">
            <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide">
              Deck complete
            </span>
          </Pill>
          <h2 className="v2-display mt-4 text-[28px] sm:text-[32px]">
            {accuracy >= 80
              ? 'Crushed it.'
              : accuracy >= 50
                ? 'Solid pass.'
                : 'Worth another loop.'}
          </h2>
          <p className="mt-2 text-[14px] text-v2-foreground-muted">
            {filterLabel}
          </p>

          <div className="mx-auto mt-7 grid max-w-[400px] grid-cols-2 gap-3">
            <div className="rounded-xl border border-v2-border bg-v2-success-soft p-5">
              <div className="flex items-center justify-center gap-2">
                <Check className="h-4 w-4 text-v2-success" strokeWidth={2.5} />
                <span className="v2-display text-[28px] leading-none text-v2-success">
                  {knew}
                </span>
              </div>
              <p className="mt-2 font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-success">
                Got it
              </p>
            </div>
            <div className="rounded-xl border border-v2-border bg-v2-warning-soft p-5">
              <div className="flex items-center justify-center gap-2">
                <X className="h-4 w-4 text-v2-warning" strokeWidth={2.5} />
                <span className="v2-display text-[28px] leading-none text-v2-warning">
                  {needsWork}
                </span>
              </div>
              <p className="mt-2 font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-warning">
                Needs work
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Button
              onClick={() => {
                setIdx(0)
                setRevealed(false)
                setKnew(0)
                setNeedsWork(0)
              }}
            >
              <RotateCcw className="h-4 w-4" strokeWidth={2.25} />
              Restart deck
            </Button>
            <Link href="/learn">
              <Button variant="secondary">Browse concepts</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  function next(memorized: boolean) {
    if (memorized) setKnew((k) => k + 1)
    else setNeedsWork((n) => n + 1)
    setRevealed(false)
    setIdx((i) => i + 1)
  }

  const domainName =
    DOMAINS.find((d) => d.color === card!.domainColor)?.name ?? 'Concept'

  return (
    <div className="mx-auto max-w-[680px]">
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <Link
            href="/learn"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-v2-foreground-muted transition-colors hover:text-v2-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
            Learn
          </Link>
          <span className="font-v2-mono text-[11px] text-v2-foreground-subtle">
            Filter: {filterLabel}
          </span>
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-semibold text-v2-foreground">
            Card {idx + 1} of {total}
          </span>
          <span className="font-v2-mono text-v2-foreground-muted">
            {progressPct}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-v2-surface-sunken">
          <div
            className="h-full rounded-full bg-v2-gradient-brand transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      <Card
        padding="lg"
        className={`mt-6 min-h-[300px] sm:p-10 ${revealed ? 'border-v2-brand/40 shadow-v2-elevated' : ''}`}
      >
        <div className="flex items-center justify-between">
          <Link
            href={`/learn/c/${card!.conceptSlug}`}
            className="text-[12px] font-medium text-v2-foreground-muted transition-colors hover:text-v2-foreground hover:underline"
          >
            {card!.conceptName} →
          </Link>
          <Badge tone="neutral" size="sm">
            {domainName}
          </Badge>
        </div>

        <div className="mt-8 flex min-h-[160px] items-center justify-center text-center">
          {!revealed ? (
            <p className="text-[18px] leading-[1.55] text-v2-foreground sm:text-[20px]">
              {card!.front}
            </p>
          ) : (
            <p className="text-[18px] leading-[1.55] text-v2-foreground sm:text-[20px]">
              <span className="rounded-md bg-v2-success-soft px-2 py-1 font-semibold text-v2-success">
                {card!.back}
              </span>
            </p>
          )}
        </div>
      </Card>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {!revealed ? (
          <Button
            size="lg"
            onClick={() => setRevealed(true)}
            className="min-w-[220px]"
          >
            <Eye className="h-4 w-4" strokeWidth={2.25} />
            Show answer
          </Button>
        ) : (
          <>
            <Button variant="secondary" size="lg" onClick={() => next(false)}>
              <ThumbsDown className="h-4 w-4" strokeWidth={2.25} />
              Need more practice
            </Button>
            <Button size="lg" onClick={() => next(true)}>
              <ThumbsUp className="h-4 w-4" strokeWidth={2.25} />
              Got it
            </Button>
          </>
        )}
      </div>

      <div className="mt-6 flex justify-center gap-4 font-v2-mono text-[12px] text-v2-foreground-subtle">
        <span className="inline-flex items-center gap-1.5">
          <Check className="h-3 w-3 text-v2-success" strokeWidth={2.5} /> {knew}
        </span>
        <span aria-hidden>·</span>
        <span className="inline-flex items-center gap-1.5">
          <X className="h-3 w-3 text-v2-warning" strokeWidth={2.5} />{' '}
          {needsWork}
        </span>
      </div>
    </div>
  )
}
