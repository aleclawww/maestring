import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DOMAINS, TOPICS, CONCEPTS } from '@/lib/knowledge-graph/aws-saa'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MasteryBadge } from '@/components/learn/MasteryBadge'
import { masteryOf } from '@/lib/learning-engine/mastery'
import { requireAuthenticatedUser, createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

type Params = { params: { domainSlug: string; topicSlug: string } }

export function generateMetadata({ params }: Params): Metadata {
  const t = TOPICS.find(x => x.slug === params.topicSlug)
  return { title: t ? `${t.name} — Learn` : 'Learn' }
}

function difficultyLabel(d: number): { label: string; variant: 'success' | 'warning' | 'danger' } {
  if (d < 0.45) return { label: 'Beginner', variant: 'success' }
  if (d < 0.7) return { label: 'Intermediate', variant: 'warning' }
  return { label: 'Advanced', variant: 'danger' }
}

export default async function TopicPage({ params }: Params) {
  const domain = DOMAINS.find(d => d.slug === params.domainSlug)
  const topic = TOPICS.find(t => t.slug === params.topicSlug && t.domainSlug === params.domainSlug)
  if (!domain || !topic) notFound()

  const concepts = CONCEPTS.filter(c => c.topicSlug === topic.slug)

  // Fetch this user's FSRS state for the concepts in this topic.
  const user = await requireAuthenticatedUser()
  const supabase = createClient()
  const { data: stateRows } = await supabase
    .from('user_concept_states')
    .select('concepts!inner(slug), state, reps, lapses, stability')
    .eq('user_id', user.id)
  const stateBySlug = new Map<string, { state: number; reps: number; lapses: number; stability: number }>(
    ((stateRows ?? []) as unknown as Array<{
      concepts: { slug: string }; state: number; reps: number; lapses: number; stability: number
    }>)
      .filter(r => r.concepts?.slug)
      .map(r => [r.concepts.slug, { state: r.state, reps: r.reps, lapses: r.lapses, stability: r.stability }])
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="text-sm text-text-secondary">
        <Link href="/learn" className="hover:underline">Learn</Link>
        {' / '}
        <Link href={`/learn/${domain.slug}`} className="hover:underline">{domain.name}</Link>
      </nav>
      <header className="my-6">
        <h1 className="text-3xl font-bold">{topic.name}</h1>
        <p className="text-text-secondary mt-2">{concepts.length} concepts in this topic</p>
      </header>

      <div className="grid gap-3">
        {concepts.map(c => {
          const diff = difficultyLabel(c.difficulty)
          const m = masteryOf(stateBySlug.get(c.slug))
          return (
            <Link key={c.slug} href={`/learn/c/${c.slug}`}>
              <Card hover>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h2 className="font-semibold flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${m.color}`} title={m.label} />
                      {c.name}
                    </h2>
                    <Badge variant={diff.variant}>{diff.label}</Badge>
                  </div>
                  <p className="text-sm text-text-secondary mb-3 line-clamp-2">{c.description}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <MasteryBadge descriptor={m} />
                    {c.awsServices.slice(0, 3).map(s => (
                      <Badge key={s} variant="outline">{s}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
