import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, BookOpen, Lightbulb, Sparkles } from 'lucide-react'
import { DOMAINS, TOPICS, CONCEPTS } from '@/lib/knowledge-graph/aws-saa'
import { Card, Badge, Eyebrow } from '@/components/v2'
import { MasteryBadge } from '@/components/learn/MasteryBadge'
import { SelfRateButtons } from '@/components/learn/SelfRateButtons'
import { masteryOf } from '@/lib/learning-engine/mastery'
import { requireAuthenticatedUser, createClient } from '@/lib/supabase/server'
import { formatRelativeTime } from '@/lib/utils'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

type Params = { params: { conceptSlug: string } }

export function generateMetadata({ params }: Params): Metadata {
  const c = CONCEPTS.find((x) => x.slug === params.conceptSlug)
  return { title: c ? `${c.name} — Learn` : 'Learn' }
}

function parseExamTip(
  tip: string,
): { condition: string; answer: string } | null {
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
  const concept = CONCEPTS.find((c) => c.slug === params.conceptSlug)
  if (!concept) notFound()

  const domain = DOMAINS.find((d) => d.slug === concept.domainSlug)
  const topic = TOPICS.find((t) => t.slug === concept.topicSlug)
  const related = concept.confusedWith
    .map((slug) => CONCEPTS.find((c) => c.slug === slug))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))

  const user = await requireAuthenticatedUser()
  const supabase = createClient()
  const { data: stateRow } = await supabase
    .from('user_concept_states')
    .select(
      'state, reps, lapses, stability, next_review_date, concepts!inner(slug)',
    )
    .eq('user_id', user.id)
    .eq('concepts.slug', params.conceptSlug)
    .maybeSingle()
  const stateLike = stateRow as unknown as
    | {
        state: number
        reps: number
        lapses: number
        stability: number
        next_review_date: string | null
      }
    | null
  const mastery = masteryOf(stateLike)
  const accuracy =
    stateLike && stateLike.reps > 0
      ? Math.round(((stateLike.reps - stateLike.lapses) / stateLike.reps) * 100)
      : null
  const nextReview = stateLike?.next_review_date
    ? formatRelativeTime(stateLike.next_review_date)
    : null

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1.5 font-v2-mono text-[12px] uppercase tracking-v2-wide text-v2-foreground-subtle">
        <Link
          href="/learn"
          className="transition-colors hover:text-v2-foreground"
        >
          Learn
        </Link>
        {domain && (
          <>
            <span aria-hidden>/</span>
            <Link
              href={`/learn/${domain.slug}`}
              className="transition-colors hover:text-v2-foreground"
            >
              {domain.name}
            </Link>
          </>
        )}
        {topic && domain && (
          <>
            <span aria-hidden>/</span>
            <Link
              href={`/learn/${domain.slug}/${topic.slug}`}
              className="transition-colors hover:text-v2-foreground"
            >
              {topic.name}
            </Link>
          </>
        )}
      </nav>

      {/* Header */}
      <header>
        <Eyebrow>Concept</Eyebrow>
        <h1 className="v2-display mt-2 text-[32px] sm:text-[40px]">
          {concept.name}
        </h1>
        <p className="mt-2 text-[15px] leading-[1.6] text-v2-foreground-muted">
          {concept.description}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <MasteryBadge descriptor={mastery} />
          {accuracy !== null && (
            <span className="font-v2-mono text-[11px] text-v2-foreground-subtle">
              · {accuracy}% accuracy ({stateLike!.reps} attempt
              {stateLike!.reps === 1 ? '' : 's'})
            </span>
          )}
          {nextReview && (
            <span className="font-v2-mono text-[11px] text-v2-foreground-subtle">
              · next review {nextReview}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {concept.awsServices.map((s) => (
            <Badge key={s} tone="brand" size="sm">
              {s}
            </Badge>
          ))}
        </div>
      </header>

      {/* Self-rate */}
      <Card padding="md">
        <SelfRateButtons conceptSlug={concept.slug} />
      </Card>

      {/* Key Facts */}
      <section>
        <Eyebrow>Key facts</Eyebrow>
        <Card padding="lg" className="mt-3">
          <ul className="space-y-3">
            {concept.keyFacts.map((f, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-v2-mono text-[13px] font-semibold text-v2-brand">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[14px] leading-[1.6] text-v2-foreground">
                  {f}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* Exam Triggers */}
      {concept.examTips.length > 0 && (
        <section>
          <Eyebrow>Exam triggers</Eyebrow>
          <p className="mt-2 max-w-[560px] text-[13px] leading-[1.6] text-v2-foreground-muted">
            Phrases the exam uses to point at this concept and the answer they
            map to.
          </p>
          <div className="mt-4 space-y-2.5">
            {concept.examTips.map((tip, i) => {
              const parsed = parseExamTip(tip)
              if (!parsed) {
                return (
                  <Card key={i} padding="md">
                    <p className="text-[14px] leading-[1.55] text-v2-foreground">
                      {tip}
                    </p>
                  </Card>
                )
              }
              return (
                <Card
                  key={i}
                  padding="md"
                  className="border-l-[3px] border-l-v2-brand"
                >
                  <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
                    <div>
                      <p className="font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-foreground-subtle">
                        If you see
                      </p>
                      <p className="mt-1 text-[14px] italic text-v2-foreground">
                        "{parsed.condition}"
                      </p>
                    </div>
                    <ArrowRight
                      className="hidden h-4 w-4 text-v2-brand md:block"
                      strokeWidth={2.25}
                    />
                    <div>
                      <p className="font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-foreground-subtle">
                        Answer with
                      </p>
                      <p className="mt-1 text-[14px] font-bold text-v2-foreground">
                        {parsed.answer}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {/* Related */}
      {related.length > 0 && (
        <section>
          <Eyebrow>Often confused with</Eyebrow>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/learn/c/${r.slug}`}
                className="group block"
              >
                <Card interactive padding="md">
                  <h3 className="text-[14px] font-bold text-v2-foreground">
                    {r.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-[1.55] text-v2-foreground-muted">
                    {r.description}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA pair */}
      <section className="grid gap-3 md:grid-cols-2">
        <Link
          href={`/study?concept=${concept.slug}`}
          className="group block"
        >
          <Card interactive padding="lg" className="border-l-[3px] border-l-v2-brand h-full">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-v2-brand-soft text-v2-brand">
              <BookOpen className="h-4 w-4" strokeWidth={2} />
            </div>
            <h3 className="mt-4 text-[15px] font-bold text-v2-foreground">
              Practice this concept
            </h3>
            <p className="mt-1 text-[12px] leading-[1.55] text-v2-foreground-muted">
              Multiple-choice questions targeted at {concept.name}.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-v2-brand">
              Start
              <ArrowRight
                className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                strokeWidth={2.5}
              />
            </span>
          </Card>
        </Link>
        <Link
          href={`/flashcards?concept=${concept.slug}`}
          className="group block"
        >
          <Card interactive padding="lg" className="h-full">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-v2-accent-soft-2 text-v2-accent">
              <Lightbulb className="h-4 w-4" strokeWidth={2} />
            </div>
            <h3 className="mt-4 text-[15px] font-bold text-v2-foreground">
              Flashcards
            </h3>
            <p className="mt-1 text-[12px] leading-[1.55] text-v2-foreground-muted">
              Drill the key facts above.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-v2-accent">
              Open deck
              <ArrowRight
                className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                strokeWidth={2.5}
              />
            </span>
          </Card>
        </Link>
      </section>
    </div>
  )
}
