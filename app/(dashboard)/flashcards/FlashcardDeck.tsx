'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
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

export function FlashcardDeck({ cards: initial, filterLabel }: { cards: Flashcard[]; filterLabel: string }) {
  const [cards] = useState(() => shuffle(initial).slice(0, 50))
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [knew, setKnew] = useState(0)
  const [needsWork, setNeedsWork] = useState(0)

  const card = cards[idx]
  const total = cards.length
  const done = idx >= total

  const progressPct = useMemo(() => Math.round((idx / Math.max(total, 1)) * 100), [idx, total])

  if (total === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">No cards available</h1>
        <p className="text-text-secondary mb-6">No flashcards could be built from this filter.</p>
        <Link href="/flashcards"><Button>Back to all cards</Button></Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 text-center">
        <h1 className="text-3xl font-bold mb-2">Deck finished 🎉</h1>
        <p className="text-text-secondary mb-6">{filterLabel}</p>
        <div className="grid grid-cols-2 gap-3 mb-8">
          <Card><CardContent className="p-5">
            <p className="text-3xl font-bold text-success">{knew}</p>
            <p className="text-xs text-text-secondary mt-1">Got it</p>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <p className="text-3xl font-bold text-warning">{needsWork}</p>
            <p className="text-xs text-text-secondary mt-1">Needs work</p>
          </CardContent></Card>
        </div>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => { setIdx(0); setRevealed(false); setKnew(0); setNeedsWork(0) }}>
            Restart deck
          </Button>
          <Link href="/learn"><Button variant="ghost">Browse concepts</Button></Link>
        </div>
      </div>
    )
  }

  function next(memorized: boolean) {
    if (memorized) setKnew(k => k + 1); else setNeedsWork(n => n + 1)
    setRevealed(false)
    setIdx(i => i + 1)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <Link href="/learn" className="text-sm text-text-secondary hover:underline">← Learn</Link>
          <span className="text-xs text-text-secondary">Filter: {filterLabel}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Card {idx + 1} of {total}</span>
          <span className="text-text-secondary">{progressPct}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-surface overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </header>

      <Card glow={revealed} className="min-h-[280px]">
        <CardContent className="p-8 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <Link
              href={`/learn/c/${card!.conceptSlug}`}
              className="text-xs text-text-secondary hover:underline"
            >
              {card!.conceptName} →
            </Link>
            <Badge variant="outline" style={{ borderColor: card!.domainColor, color: card!.domainColor }}>
              {DOMAINS.find(d => d.color === card!.domainColor)?.name ?? 'Concept'}
            </Badge>
          </div>

          <div className="flex-1 flex items-center justify-center text-center">
            {!revealed ? (
              <p className="text-lg leading-relaxed">{card!.front}</p>
            ) : (
              <p className="text-lg leading-relaxed text-success">{card!.back}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-center gap-3">
        {!revealed ? (
          <Button onClick={() => setRevealed(true)} className="min-w-[200px]">
            Show answer
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={() => next(false)}>
              ❌ Need more practice
            </Button>
            <Button onClick={() => next(true)}>
              ✅ Got it
            </Button>
          </>
        )}
      </div>

      <div className="mt-6 flex justify-center gap-3 text-xs text-text-secondary">
        <span>{knew} ✅</span>
        <span>·</span>
        <span>{needsWork} ❌</span>
      </div>
    </div>
  )
}
