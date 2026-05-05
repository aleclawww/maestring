import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react'
import { DOMAINS, TOPICS, CONCEPTS } from '@/lib/knowledge-graph/aws-saa'
import { Card, Badge, Eyebrow } from '@/components/v2'
import type { Metadata } from 'next'

type Params = { params: { domainSlug: string } }

export function generateStaticParams() {
  return DOMAINS.map((d) => ({ domainSlug: d.slug }))
}

export function generateMetadata({ params }: Params): Metadata {
  const d = DOMAINS.find((x) => x.slug === params.domainSlug)
  return { title: d ? `${d.name} — Learn` : 'Learn' }
}

export default function DomainPage({ params }: Params) {
  const domain = DOMAINS.find((d) => d.slug === params.domainSlug)
  if (!domain) notFound()

  const topics = TOPICS.filter((t) => t.domainSlug === domain.slug)

  return (
    <div className="space-y-8">
      <Link
        href="/learn"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-v2-foreground-muted transition-colors hover:text-v2-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
        Learn
      </Link>

      <header>
        <Eyebrow>Domain</Eyebrow>
        <h1 className="v2-display mt-2 text-[32px] sm:text-[40px]">
          {domain.name}
        </h1>
        <p className="mt-2 max-w-[640px] text-[15px] leading-[1.6] text-v2-foreground-muted">
          {domain.description}
        </p>
        <Badge tone="brand" size="md" className="mt-4">
          {domain.examWeightPercent}% of exam
        </Badge>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {topics.map((t) => {
          const concepts = CONCEPTS.filter((c) => c.topicSlug === t.slug)
          return (
            <Link
              key={t.slug}
              href={`/learn/${domain.slug}/${t.slug}`}
              className="group block"
            >
              <Card interactive className="h-full">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-v2-brand-soft text-v2-brand">
                    <BookOpen className="h-4 w-4" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[16px] font-bold text-v2-foreground">
                      {t.name}
                    </h2>
                    <p className="mt-1 font-v2-mono text-[11px] text-v2-foreground-subtle">
                      {concepts.length} concept
                      {concepts.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-v2-foreground-subtle transition-transform duration-200 ease-v2 group-hover:translate-x-1 group-hover:text-v2-brand"
                    strokeWidth={2.25}
                  />
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
