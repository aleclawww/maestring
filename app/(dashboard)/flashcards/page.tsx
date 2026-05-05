import { DOMAINS, CONCEPTS, type ConceptDefinition } from '@/lib/knowledge-graph/aws-saa'
import { FlashcardDeck } from './FlashcardDeck'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Flashcards' }

export interface Flashcard {
  front: string
  back: string
  conceptName: string
  conceptSlug: string
  domainColor: string
}

function buildCards(concepts: ConceptDefinition[]): Flashcard[] {
  const cards: Flashcard[] = []
  for (const c of concepts) {
    const domainColor = DOMAINS.find(d => d.slug === c.domainSlug)?.color ?? '#888'

    // Card type 1: prompt the user to recall a key fact about the concept,
    // then reveal one canonical fact from the knowledge graph.
    for (const fact of c.keyFacts) {
      cards.push({
        front: `Recall: name a key fact about ${c.name}`,
        back: fact,
        conceptName: c.name,
        conceptSlug: c.slug,
        domainColor,
      })
    }

    // Card type 2: from each examTip — "If exam says X" → answer
    for (const tip of c.examTips) {
      const arrowIdx = tip.lastIndexOf('→')
      if (arrowIdx === -1) continue
      const condition = tip
        .slice(0, arrowIdx)
        .trim()
        .replace(/^(If it says|Si dice)\s*/i, '')
        .replace(/^"|"$/g, '')
      const answer = tip.slice(arrowIdx + 1).trim()
      if (!condition || !answer) continue
      cards.push({
        front: `Exam phrasing: "${condition}". What's the BEST answer?`,
        back: `${answer} — pattern of ${c.name}`,
        conceptName: c.name,
        conceptSlug: c.slug,
        domainColor,
      })
    }
  }
  return cards
}

export default function FlashcardsPage({ searchParams }: { searchParams: { concept?: string; domain?: string } }) {
  let pool = CONCEPTS
  if (searchParams.concept) pool = CONCEPTS.filter(c => c.slug === searchParams.concept)
  else if (searchParams.domain) pool = CONCEPTS.filter(c => c.domainSlug === searchParams.domain)

  const cards = buildCards(pool)
  const filterLabel = searchParams.concept
    ? CONCEPTS.find(c => c.slug === searchParams.concept)?.name ?? 'concept'
    : searchParams.domain
      ? DOMAINS.find(d => d.slug === searchParams.domain)?.name ?? 'domain'
      : 'all SAA-C03'

  return (
    <div className="space-y-8">
      <header>
        <p className="font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-subtle">
          Drill mode
        </p>
        <h1 className="v2-display mt-2 text-[28px] sm:text-[32px]">
          Flashcards · {filterLabel}
        </h1>
        <p className="mt-2 max-w-[560px] text-[15px] leading-[1.6] text-v2-foreground-muted">
          Quick recall practice on the key facts of every concept. Self-grade
          honestly — the scheduler trusts your taps.
        </p>
      </header>
      <FlashcardDeck cards={cards} filterLabel={filterLabel} />
    </div>
  )
}
