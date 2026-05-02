import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DOMAINS, TOPICS, CONCEPTS } from '@/lib/knowledge-graph/aws-saa'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MasteryBadge } from '@/components/learn/MasteryBadge'
import { SelfRateButtons } from '@/components/learn/SelfRateButtons'
import { masteryOf } from '@/lib/learning-engine/mastery'
import { requireAuthenticatedUser, createClient } from '@/lib/supabase/server'
import { formatRelativeTime } from '@/lib/utils'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

type Params = { params: { conceptSlug: string } }

export function generateMetadata({ params }: Params): Metadata {
  const c = CONCEPTS.find(x => x.slug === params.conceptSlug)
  return { title: c ? `${c.name} — Learn` : 'Learn' }
}

function parseExamTip(tip: string): { condition: string; answer: string } | null {
  const arrowIdx = tip.lastIndexOf('→')
  if (arrowIdx === -1) return null
  const condition = tip
    .slice(0, arrowIdx)
    .trim()
    .replace(/^(If it says|Si dice)\s*/i, '')
    .replace(/^"|"$/g, '')
  const answer = tip.slice(arrowIdx + 1).trim()
  if (!condition || !answer) return null
  return { condition, answer }
}

export default async function ConceptPage({ params }: Params) {
  const concept = CONCEPTS.find(c => c.slug === params.conceptSlug)
  if (!concept) notFound()

  const domain = DOMAINS.find(d => d.slug === concept.domainSlug)
  const topic = TOPICS.find(t => t.slug === concept.topicSlug)
  const related = concept.confusedWith
    .map(slug => CONCEPTS.find(c => c.slug === slug))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))

  // Mastery state for this concept
  const user = await requireAuthenticatedUser()
  const supabase = createClient()
  const { data: stateRow } = await supabase
    .from('user_concept_states')
    .select('state, reps, lapses, stability, next_review_date, concepts!inner(slug)')
    .eq('user_id', user.id)
    .eq('concepts.slug', params.conceptSlug)
    .maybeSingle()
  const stateLike = stateRow as unknown as
    | { state: number; reps: number; lapses: number; stability: number; next_review_date: string | null }
    | null
  const mastery = masteryOf(stateLike)
  const accuracy = stateLike && stateLike.reps > 0
    ? Math.round(((stateLike.reps - stateLike.lapses) / stateLike.reps) * 100)
    : null
  const nextReview = stateLike?.next_review_date
    ? formatRelativeTime(stateLike.next_review_date)
    : null

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <nav className="text-sm text-text-secondary">
        <Link href="/learn" className="hover:underline">Learn</Link>
        {domain && (<>{' / '}<Link href={`/learn/${domain.slug}`} className="hover:underline">{domain.name}</Link></>)}
        {topic && domain && (<>{' / '}<Link href={`/learn/${domain.slug}/${topic.slug}`} className="hover:underline">{topic.name}</Link></>)}
      </nav>

      <header className="my-6">
        <h1 className="text-3xl font-bold">{concept.name}</h1>
        <p className="text-text-secondary mt-2">{concept.description}</p>
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <MasteryBadge descriptor={mastery} />
          {accuracy !== null && (
            <span className="text-xs text-text-secondary">
              · {accuracy}% accuracy ({stateLike!.reps} attempt{stateLike!.reps === 1 ? '' : 's'})
            </span>
          )}
          {nextReview && (
            <span className="text-xs text-text-secondary">· next review {nextReview}</span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {concept.awsServices.map(s => (
            <Badge key={s} variant="info">{s}</Badge>
          ))}
        </div>
      </header>

      <div className="mb-6">
        <Card><CardContent className="p-4"><SelfRateButtons conceptSlug={concept.slug} /></CardContent></Card>
      </div>

      {/* Key Facts */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Key Facts</h2>
        <Card>
          <CardContent className="p-5">
            <ul className="space-y-2">
              {concept.keyFacts.map((f, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-primary font-mono text-sm shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-sm">{f}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Exam Tips */}
      {concept.examTips.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Exam Triggers</h2>
          <p className="text-xs text-text-secondary mb-3">
            Phrases the exam uses to point at this concept and the answer they map to.
          </p>
          <div className="space-y-2">
            {concept.examTips.map((tip, i) => {
              const parsed = parseExamTip(tip)
              if (!parsed) {
                return (
                  <Card key={i}>
                    <CardContent className="p-4 text-sm">{tip}</CardContent>
                  </Card>
                )
              }
              return (
                <Card key={i}>
                  <CardContent className="p-4 grid gap-2 md:grid-cols-[1fr_auto_1fr] md:items-center">
                    <div className="text-sm">
                      <span className="text-xs text-text-secondary block mb-1">If you see</span>
                      <span className="italic">&ldquo;{parsed.condition}&rdquo;</span>
                    </div>
                    <span className="text-primary text-center hidden md:block">→</span>
                    <div className="text-sm">
                      <span className="text-xs text-text-secondary block mb-1">Answer with</span>
                      <span className="font-semibold">{parsed.answer}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {/* Related / Confused with */}
      {related.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Often Confused With</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {related.map(r => (
              <Link key={r.slug} href={`/learn/c/${r.slug}`}>
                <Card hover>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm">{r.name}</h3>
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2">{r.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mt-10 grid gap-3 md:grid-cols-2">
        <Link href={`/study?concept=${concept.slug}`}>
          <Card hover className="border-primary/40">
            <CardContent className="p-5">
              <h3 className="font-semibold mb-1">📖 Practice this concept</h3>
              <p className="text-xs text-text-secondary">Multiple-choice questions targeted at {concept.name}.</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/flashcards?concept=${concept.slug}`}>
          <Card hover>
            <CardContent className="p-5">
              <h3 className="font-semibold mb-1">🃏 Flashcards</h3>
              <p className="text-xs text-text-secondary">Drill the key facts above.</p>
            </CardContent>
          </Card>
        </Link>
      </section>
    </div>
  )
}
