import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DOMAINS, TOPICS, CONCEPTS } from '@/lib/knowledge-graph/aws-saa'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Metadata } from 'next'

type Params = { params: { domainSlug: string } }

export function generateStaticParams() {
  return DOMAINS.map(d => ({ domainSlug: d.slug }))
}

export function generateMetadata({ params }: Params): Metadata {
  const d = DOMAINS.find(x => x.slug === params.domainSlug)
  return { title: d ? `${d.name} — Learn` : 'Learn' }
}

export default function DomainPage({ params }: Params) {
  const domain = DOMAINS.find(d => d.slug === params.domainSlug)
  if (!domain) notFound()

  const topics = TOPICS.filter(t => t.domainSlug === domain.slug)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/learn" className="text-sm text-text-secondary hover:underline">← Learn</Link>
      <header className="my-6">
        <h1 className="text-3xl font-bold" style={{ color: domain.color }}>{domain.name}</h1>
        <p className="text-text-secondary mt-2">{domain.description}</p>
        <Badge variant="outline" className="mt-3">{domain.examWeightPercent}% of exam</Badge>
      </header>

      <div className="grid gap-3">
        {topics.map(t => {
          const concepts = CONCEPTS.filter(c => c.topicSlug === t.slug)
          return (
            <Link key={t.slug} href={`/learn/${domain.slug}/${t.slug}`}>
              <Card hover>
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">{t.name}</h2>
                    <p className="text-xs text-text-secondary mt-1">
                      {concepts.length} concept{concepts.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="text-text-secondary">→</span>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
