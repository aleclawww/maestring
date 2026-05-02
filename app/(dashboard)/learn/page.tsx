import Link from 'next/link'
import { DOMAINS, TOPICS, CONCEPTS } from '@/lib/knowledge-graph/aws-saa'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Learn — AWS SAA-C03' }

export default function LearnIndexPage() {
  const counts = new Map<string, number>()
  for (const c of CONCEPTS) counts.set(c.domainSlug, (counts.get(c.domainSlug) ?? 0) + 1)
  const topicCounts = new Map<string, number>()
  for (const t of TOPICS) topicCounts.set(t.domainSlug, (topicCounts.get(t.domainSlug) ?? 0) + 1)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Learn</h1>
        <p className="text-text-secondary mt-2">
          Browse the AWS Solutions Architect Associate (SAA-C03) syllabus by domain. {CONCEPTS.length} concepts across {TOPICS.length} topics.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {DOMAINS.map(d => (
          <Link key={d.slug} href={`/learn/${d.slug}`}>
            <Card hover className="h-full">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h2 className="text-xl font-semibold" style={{ color: d.color }}>
                    {d.name}
                  </h2>
                  <Badge variant="outline">{d.examWeightPercent}% of exam</Badge>
                </div>
                <p className="text-sm text-text-secondary mb-4">{d.description}</p>
                <div className="flex gap-3 text-xs text-text-secondary">
                  <span>{topicCounts.get(d.slug) ?? 0} topics</span>
                  <span>·</span>
                  <span>{counts.get(d.slug) ?? 0} concepts</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Link href="/study">
          <Card hover className="h-full">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-1">📖 Practice questions</h3>
              <p className="text-sm text-text-secondary">FSRS-scheduled multiple-choice quizzes for active recall.</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/flashcards">
          <Card hover className="h-full">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-1">🃏 Flashcards</h3>
              <p className="text-sm text-text-secondary">Fast recall drills built from the key facts of every concept.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
