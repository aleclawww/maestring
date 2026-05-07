import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { BriefsAdminClient } from './client'

export const dynamic = 'force-dynamic'

interface BriefRow {
  concept_id: string
  title: string
  body_md: string
  gotchas: string[] | null
  related_concept_ids: string[] | null
  diagram_url: string | null
  updated_at: string
}

export default async function BriefsAdminPage() {
  const supabase = createAdminClient()

  // Briefs joined with the concept name for display.
  const { data: briefs, error: briefsErr } = await supabase
    .from('concept_briefs')
    .select(
      'concept_id, title, body_md, gotchas, related_concept_ids, diagram_url, updated_at, concepts:concept_id ( name, slug )',
    )
    .order('updated_at', { ascending: false })
  if (briefsErr) {
    logger.warn(
      { err: briefsErr },
      'admin/briefs: failed to read concept_briefs — list will be empty',
    )
  }

  type Joined = BriefRow & { concepts: { name: string; slug: string } | null }
  // Cast via unknown: the FK-relation join is correct at runtime (concept_id
  // → concepts.id), but Supabase's generated types don't always detect FKs
  // for tables added in the latest regen, so the inferred shape is a
  // SelectQueryError. We know the columns are valid.
  const rows = (briefs ?? []) as unknown as Joined[]

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Concept Briefs</h1>
          <p className="text-sm text-v2-foreground-subtle">
            Pre-learning explanations shown before the first question of a
            concept the user has never seen.
          </p>
        </div>
        <Link
          href="/admin/briefs/new"
          className="inline-flex h-9 items-center gap-1 rounded-lg bg-v2-gradient-brand px-4 text-[13px] font-semibold text-white shadow-v2-button transition-all hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" strokeWidth={2.25} />
          New brief
        </Link>
      </div>

      <BriefsAdminClient
        rows={rows.map((r) => ({
          conceptId: r.concept_id,
          conceptName: r.concepts?.name ?? '(deleted concept)',
          title: r.title,
          updatedAt: r.updated_at,
          hasDiagram: Boolean(r.diagram_url),
          gotchasCount: Array.isArray(r.gotchas) ? r.gotchas.length : 0,
        }))}
      />
    </div>
  )
}
