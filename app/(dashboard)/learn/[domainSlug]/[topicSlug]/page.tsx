import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { DOMAINS, TOPICS, CONCEPTS } from '@/lib/knowledge-graph/aws-saa'
import { Card, Badge, Eyebrow } from '@/components/v2'
import { MasteryBadge } from '@/components/learn/MasteryBadge'
import { masteryOf } from '@/lib/learning-engine/mastery'
import { requireAuthenticatedUser, createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

type Params = { params: { domainSlug: string; topicSlug: string } }

export function generateMetadata({ params }: Params): Metadata {
  const t = TOPICS.find((x) => x.slug === params.topicSlug)
  return { title: t ? `${t.name} — Learn` : 'Learn' }
}

function difficultyLabel(d: number): {
  label: string
  tone: 'success' | 'warning' | 'error'
} {
  if (d < 0.45) return { label: 'Beginner', tone: 'success' }
  if (d < 0.7) return { label: 'Intermediate', tone: 'warning' }
  return { label: 'Advanced', tone: 'error' }
}

export default async function TopicPage({ params }: Params) {
  const domain = DOMAINS.find((d) => d.slug === params.domainSlug)
  const topic = TOPICS.find(
    (t) =>
      t.slug === params.topicSlug && t.domainSlug === params.domainSlug,
  )
  if (!domain || !topic) notFound()

  const concepts = CONCEPTS.filter((c) => c.topicSlug === topic.slug)

  const user = await requireAuthenticatedUser()
  const supabase = createClient()
  const { data: stateRows } = await supabase
    .from('user_concept_states')
    .select('concepts!inner(slug), state, reps, lapses, stability')
    .eq('user_id', user.id)
  const stateBySlug = new Map<
    string,
    { state: number; reps: number; lapses: number; stability: number }
  >(
    ((stateRows ?? []) as unknown as Array<{
      concepts: { slug: string }
      state: number
      reps: number
      lapses: number
      stability: number
    }>)
      .filter((r) => r.concepts?.slug)
      .map((r) => [
        r.concepts.slug,
        {
          state: r.state,
          reps: r.reps,
          lapses: r.lapses,
          stability: r.stability,
        },
      ]),
  )

  return (
    <div className="space-y-8">
      <nav className="flex items-center gap-1.5 font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-subtle">
        <Link
          href="/learn"
          className="transition-colors hover:text-v2-foreground"
        >
          Learn
        </Link>
        <span aria-hidden>/</span>
        <Link
          href={`/learn/${domain.slug}`}
          className="transition-colors hover:text-v2-foreground"
        >
          {domain.name}
        </Link>
      </nav>

      <header>
        <Eyebrow>Topic</Eyebrow>
        <h1 className="v2-display mt-2 text-[32px] sm:text-[40px]">
          {topic.name}
        </h1>
        <p className="mt-2 text-[14px] text-v2-foreground-muted">
          {concepts.length} concept{concepts.length === 1 ? '' : 's'} in this
          topic
        </p>
      </header>

      <div className="grid gap-4">
        {concepts.map((c) => {
          const diff = difficultyLabel(c.difficulty)
          const m = masteryOf(stateBySlug.get(c.slug))
          return (
            <Link
              key={c.slug}
              href={`/learn/c/${c.slug}`}
              className="group block"
            >
              <Card interactive padding="lg">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-[17px] font-bold text-v2-foreground">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${m.color}`}
                      title={m.label}
                    />
                    {c.name}
                  </h2>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={diff.tone} size="sm">
                      {diff.label}
                    </Badge>
                    <ArrowRight
                      className="h-4 w-4 text-v2-foreground-subtle transition-transform duration-200 ease-v2 group-hover:translate-x-1 group-hover:text-v2-brand"
                      strokeWidth={2.25}
                    />
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-[14px] leading-[1.55] text-v2-foreground-muted">
                  {c.description}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <MasteryBadge descriptor={m} />
                  {c.awsServices.slice(0, 3).map((s) => (
                    <Badge key={s} tone="neutral" size="sm">
                      {s}
                    </Badge>
                  ))}
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
