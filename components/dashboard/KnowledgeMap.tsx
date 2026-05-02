import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { CONCEPTS, DOMAINS, type ConceptDefinition } from '@/lib/knowledge-graph/aws-saa'
import { masteryOf, masteryCounts, type ConceptStateLike, type MasteryDescriptor } from '@/lib/learning-engine/mastery'

export interface KnowledgeMapProps {
  /** Per-slug FSRS state (rows the user has touched). */
  stateBySlug: Map<string, ConceptStateLike>
}

export function KnowledgeMap({ stateBySlug }: KnowledgeMapProps) {
  const total = CONCEPTS.length
  const counts = masteryCounts(
    CONCEPTS.map(c => stateBySlug.get(c.slug) ?? {}),
    total
  )

  const tiers: Array<{ key: keyof typeof counts; label: string; color: string; hex: string }> = [
    { key: 'mastered',   label: 'Mastered',   color: 'bg-success',          hex: '#10b981' },
    { key: 'proficient', label: 'Proficient', color: 'bg-blue-500',         hex: '#3b82f6' },
    { key: 'familiar',   label: 'Familiar',   color: 'bg-warning',          hex: '#f59e0b' },
    { key: 'learning',   label: 'Learning',   color: 'bg-danger',           hex: '#ef4444' },
    { key: 'not_seen',   label: 'Not seen',   color: 'bg-text-muted/30',    hex: '#6b7280' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Knowledge map</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Legend / counts */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-5">
          {tiers.map(t => (
            <div key={t.key} className="rounded-lg border border-border px-3 py-2">
              <div className="flex items-center gap-2 text-xs mb-1">
                <span className={`h-2.5 w-2.5 rounded-full ${t.color}`} />
                <span className="text-text-secondary">{t.label}</span>
              </div>
              <p className="text-xl font-bold tabular-nums">{counts[t.key]}</p>
            </div>
          ))}
        </div>

        {/* Per-domain grids */}
        <div className="space-y-5">
          {DOMAINS.map(d => {
            const domainConcepts = CONCEPTS.filter(c => c.domainSlug === d.slug)
            const domainStates = domainConcepts.map(c => stateBySlug.get(c.slug) ?? {})
            const dCounts = masteryCounts(domainStates, domainConcepts.length)
            const masteredPct = Math.round(
              ((dCounts.mastered + dCounts.proficient * 0.6 + dCounts.familiar * 0.3) / domainConcepts.length) * 100
            )
            return (
              <div key={d.slug}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold" style={{ color: d.color }}>{d.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-text-secondary">
                    <span>{domainConcepts.length} concepts</span>
                    <span className="font-bold text-text-primary tabular-nums">{masteredPct}%</span>
                  </div>
                </div>
                {/* Stacked bar */}
                <div className="h-2 w-full rounded-full overflow-hidden flex bg-text-muted/10 mb-2">
                  {(['mastered', 'proficient', 'familiar', 'learning'] as const).map(k => {
                    const w = (dCounts[k] / domainConcepts.length) * 100
                    if (w === 0) return null
                    return (
                      <div
                        key={k}
                        className={tiers.find(t => t.key === k)!.color}
                        style={{ width: `${w}%` }}
                      />
                    )
                  })}
                </div>
                {/* Concept dot grid */}
                <div className="flex flex-wrap gap-1.5">
                  {domainConcepts.map(c => (
                    <ConceptDot key={c.slug} concept={c} state={stateBySlug.get(c.slug)} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-text-secondary mt-4 text-center">
          Hover a dot for the concept, click to open it.
        </p>
      </CardContent>
    </Card>
  )
}

function ConceptDot({ concept, state }: { concept: ConceptDefinition; state: ConceptStateLike | undefined }) {
  const m: MasteryDescriptor = masteryOf(state)
  return (
    <Link
      href={`/learn/c/${concept.slug}`}
      title={`${concept.name} — ${m.label}`}
      className={`h-3.5 w-3.5 rounded-sm ${m.color} hover:ring-2 hover:ring-primary transition-all`}
    />
  )
}
