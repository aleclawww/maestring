import Link from 'next/link'
import { ArrowRight, BookOpen, Map as MapIcon, Sparkles } from 'lucide-react'
import { Card, Eyebrow, Button } from '@/components/v2'
import {
  CONCEPTS,
  DOMAINS,
  type ConceptDefinition,
} from '@/lib/knowledge-graph/aws-saa'
import {
  masteryOf,
  masteryCounts,
  type ConceptStateLike,
  type MasteryDescriptor,
} from '@/lib/learning-engine/mastery'

export interface KnowledgeMapProps {
  /** Per-slug FSRS state (rows the user has touched). */
  stateBySlug: Map<string, ConceptStateLike>
}

export function KnowledgeMap({ stateBySlug }: KnowledgeMapProps) {
  const total = CONCEPTS.length
  const counts = masteryCounts(
    CONCEPTS.map((c) => stateBySlug.get(c.slug) ?? {}),
    total,
  )

  const hasAnyProgress = stateBySlug.size > 0
  if (!hasAnyProgress) {
    return (
      <Card padding="lg" className="text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-v2-brand-soft text-v2-brand">
          <MapIcon className="h-6 w-6" strokeWidth={2} />
        </div>
        <h3 className="v2-display mt-5 text-[22px]">
          Your map will appear as you study
        </h3>
        <p className="mx-auto mt-2 max-w-[480px] text-[14px] leading-[1.65] text-v2-foreground-muted">
          Each of the {total} SAA-C03 concepts climbs from grey →
          red → orange → blue → green as your FSRS-tracked mastery rises. Start
          a session and watch it light up.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link href="/learn/session">
            <Button>
              <Sparkles className="h-4 w-4" strokeWidth={2.25} />
              Open Coach
            </Button>
          </Link>
          <Link href="/study">
            <Button variant="secondary">Quick session</Button>
          </Link>
          <Link href="/learn">
            <Button variant="secondary">
              <BookOpen className="h-4 w-4" strokeWidth={2} />
              Browse syllabus
            </Button>
          </Link>
        </div>
      </Card>
    )
  }

  const tiers: Array<{
    key: keyof typeof counts
    label: string
    dotClass: string
    barClass: string
  }> = [
    {
      key: 'mastered',
      label: 'Mastered',
      dotClass: 'bg-v2-success',
      barClass: 'bg-v2-success',
    },
    {
      key: 'proficient',
      label: 'Proficient',
      dotClass: 'bg-v2-brand',
      barClass: 'bg-v2-brand',
    },
    {
      key: 'familiar',
      label: 'Familiar',
      dotClass: 'bg-v2-warning',
      barClass: 'bg-v2-warning',
    },
    {
      key: 'learning',
      label: 'Learning',
      dotClass: 'bg-v2-error',
      barClass: 'bg-v2-error',
    },
    {
      key: 'not_seen',
      label: 'Not seen',
      dotClass: 'bg-v2-surface-sunken',
      barClass: 'bg-v2-surface-sunken',
    },
  ]

  return (
    <Card padding="lg">
      <Eyebrow>Knowledge map</Eyebrow>

      {/* Legend / counts */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiers.map((t) => (
          <div
            key={t.key}
            className="rounded-lg border border-v2-border bg-v2-surface-subtle/40 px-3 py-2.5"
          >
            <div className="mb-1 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${t.dotClass}`} />
              <span className="text-[11px] font-medium text-v2-foreground-muted">
                {t.label}
              </span>
            </div>
            <p className="text-[20px] font-bold tabular-nums text-v2-foreground">
              {counts[t.key]}
            </p>
          </div>
        ))}
      </div>

      {/* Per-domain grids */}
      <div className="mt-7 space-y-6">
        {DOMAINS.map((d) => {
          const domainConcepts = CONCEPTS.filter((c) => c.domainSlug === d.slug)
          const domainStates = domainConcepts.map(
            (c) => stateBySlug.get(c.slug) ?? {},
          )
          const dCounts = masteryCounts(domainStates, domainConcepts.length)
          const masteredPct = Math.round(
            ((dCounts.mastered +
              dCounts.proficient * 0.6 +
              dCounts.familiar * 0.3) /
              domainConcepts.length) *
              100,
          )
          return (
            <div key={d.slug}>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="text-[14px] font-bold text-v2-foreground">
                  {d.name}
                </h3>
                <div className="flex items-center gap-3 font-v2-mono text-[11px] text-v2-foreground-subtle">
                  <span>{domainConcepts.length} concepts</span>
                  <span className="font-bold tabular-nums text-v2-brand">
                    {masteredPct}%
                  </span>
                </div>
              </div>
              {/* Stacked bar */}
              <div className="mb-3 flex h-2 w-full overflow-hidden rounded-full bg-v2-surface-sunken">
                {(['mastered', 'proficient', 'familiar', 'learning'] as const).map(
                  (k) => {
                    const w = (dCounts[k] / domainConcepts.length) * 100
                    if (w === 0) return null
                    return (
                      <div
                        key={k}
                        className={tiers.find((t) => t.key === k)!.barClass}
                        style={{ width: `${w}%` }}
                      />
                    )
                  },
                )}
              </div>
              {/* Concept dot grid */}
              <div className="flex flex-wrap gap-1.5">
                {domainConcepts.map((c) => (
                  <ConceptDot
                    key={c.slug}
                    concept={c}
                    state={stateBySlug.get(c.slug)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-6 inline-flex items-center justify-center gap-1.5 text-[11px] text-v2-foreground-subtle">
        Hover a dot for the concept, click to open it
        <ArrowRight className="h-3 w-3" strokeWidth={2.25} />
      </p>
    </Card>
  )
}

function ConceptDot({
  concept,
  state,
}: {
  concept: ConceptDefinition
  state: ConceptStateLike | undefined
}) {
  const m: MasteryDescriptor = masteryOf(state)
  return (
    <Link
      href={`/learn/c/${concept.slug}`}
      title={`${concept.name} — ${m.label}`}
      className={`h-3.5 w-3.5 rounded-sm transition-all hover:ring-2 hover:ring-v2-brand ${m.color}`}
    />
  )
}
