import Link from 'next/link'
import { ArrowRight, BookOpen, Sparkles, Lightbulb } from 'lucide-react'
import { DOMAINS, TOPICS, CONCEPTS } from '@/lib/knowledge-graph/aws-saa'
import { Card, Eyebrow, Pill, Badge } from '@/components/v2'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Learn — AWS SAA-C03' }

const HUE_BG = [
  'bg-v2-brand-soft text-v2-brand',
  'bg-v2-accent-soft-2 text-v2-accent',
  'bg-v2-success-soft text-v2-success',
  'bg-v2-warning-soft text-v2-warning',
] as const

export default function LearnIndexPage() {
  const counts = new Map<string, number>()
  for (const c of CONCEPTS)
    counts.set(c.domainSlug, (counts.get(c.domainSlug) ?? 0) + 1)
  const topicCounts = new Map<string, number>()
  for (const t of TOPICS)
    topicCounts.set(t.domainSlug, (topicCounts.get(t.domainSlug) ?? 0) + 1)

  return (
    <div className="space-y-10">
      <header>
        <Eyebrow>Catalog</Eyebrow>
        <h1 className="v2-display mt-2 text-[32px] sm:text-[40px]">
          The SAA-C03 syllabus,{' '}
          <span className="v2-text-gradient">domain by domain.</span>
        </h1>
        <p className="mt-3 max-w-[600px] text-[15px] leading-[1.6] text-v2-foreground-muted">
          Browse the four official content domains. {CONCEPTS.length} concepts
          across {TOPICS.length} topics, each one tied back to the exam guide.
        </p>
      </header>

      {/* Start here */}
      <Link href="/learn/exam-guide" className="group block">
        <Card interactive padding="lg" className="border-l-[3px] border-l-v2-brand">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-v2-gradient-brand text-white shadow-v2-button">
                <Sparkles className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <div>
                <Pill tone="brand" size="md">
                  <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide">
                    Start here
                  </span>
                </Pill>
                <h2 className="mt-2 text-[18px] font-bold text-v2-foreground">
                  Official SAA-C03 Exam Guide
                </h2>
                <p className="mt-1 text-[14px] leading-[1.6] text-v2-foreground-muted">
                  Format, scoring, the four content domains with every task
                  statement, and the in-scope service list.
                </p>
              </div>
            </div>
            <ArrowRight
              className="h-5 w-5 shrink-0 text-v2-foreground-subtle transition-transform duration-200 ease-v2 group-hover:translate-x-1 group-hover:text-v2-brand"
              strokeWidth={2.25}
            />
          </div>
        </Card>
      </Link>

      {/* Domain grid */}
      <section>
        <Eyebrow>Domains</Eyebrow>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          {DOMAINS.map((d, i) => {
            const hueClass = HUE_BG[i % HUE_BG.length] as string
            return (
              <Link key={d.slug} href={`/learn/${d.slug}`} className="group block">
                <Card interactive className="h-full">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${hueClass}`}
                  >
                    <BookOpen className="h-4 w-4" strokeWidth={2} />
                  </div>
                  <div className="mt-5 flex items-start justify-between gap-3">
                    <h2 className="text-[18px] font-bold leading-[1.3] text-v2-foreground">
                      {d.name}
                    </h2>
                    <Badge tone="neutral" size="sm" mono>
                      {d.examWeightPercent}%
                    </Badge>
                  </div>
                  <p className="mt-2 text-[14px] leading-[1.55] text-v2-foreground-muted">
                    {d.description}
                  </p>
                  <div className="mt-5 flex items-center gap-2 font-v2-mono text-[11px] text-v2-foreground-subtle">
                    <span>{topicCounts.get(d.slug) ?? 0} topics</span>
                    <span aria-hidden>·</span>
                    <span>{counts.get(d.slug) ?? 0} concepts</span>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Practice + flashcards */}
      <section>
        <Eyebrow>Practice modes</Eyebrow>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Link href="/study" className="group block">
            <Card interactive className="h-full">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-v2-brand-soft text-v2-brand">
                <Sparkles className="h-4 w-4" strokeWidth={2} />
              </div>
              <h3 className="mt-4 text-[16px] font-bold text-v2-foreground">
                Practice questions
              </h3>
              <p className="mt-1 text-[13px] leading-[1.6] text-v2-foreground-muted">
                FSRS-scheduled multiple-choice quizzes for active recall.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-v2-brand">
                Start session
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={2.5}
                />
              </span>
            </Card>
          </Link>
          <Link href="/flashcards" className="group block">
            <Card interactive className="h-full">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-v2-accent-soft-2 text-v2-accent">
                <Lightbulb className="h-4 w-4" strokeWidth={2} />
              </div>
              <h3 className="mt-4 text-[16px] font-bold text-v2-foreground">
                Flashcards
              </h3>
              <p className="mt-1 text-[13px] leading-[1.6] text-v2-foreground-muted">
                Fast recall drills built from the key facts of every concept.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-v2-accent">
                Open deck
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={2.5}
                />
              </span>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  )
}
