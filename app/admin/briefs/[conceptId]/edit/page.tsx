import { notFound } from 'next/navigation'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { CERTIFICATION_ID } from '@/lib/knowledge-graph/aws-saa'
import { BriefEditor } from '../../BriefEditor'

export const dynamic = 'force-dynamic'

interface BriefRow {
  concept_id: string
  title: string
  body_md: string
  gotchas: string[] | null
  related_concept_ids: string[] | null
  diagram_url: string | null
}

export default async function EditBriefPage({
  params,
}: {
  params: { conceptId: string }
}) {
  if (!z.string().uuid().safeParse(params.conceptId).success) {
    notFound()
  }

  const supabase = createAdminClient()

  const briefPromise = supabase
    .from('concept_briefs')
    .select(
      'concept_id, title, body_md, gotchas, related_concept_ids, diagram_url, concepts:concept_id ( name )',
    )
    .eq('concept_id', params.conceptId)
    .maybeSingle()
  const conceptsPromise = supabase
    .from('concepts')
    .select('id, name, slug')
    .eq('certification_id', CERTIFICATION_ID)
    .order('name')

  const [briefRes, conceptsRes] = await Promise.all([
    briefPromise,
    conceptsPromise,
  ])

  if (briefRes.error) {
    logger.error(
      { err: briefRes.error, conceptId: params.conceptId },
      'admin/briefs/[id]/edit: brief read failed',
    )
    notFound()
  }
  if (!briefRes.data) {
    notFound()
  }
  if (conceptsRes.error) {
    logger.warn(
      { err: conceptsRes.error },
      'admin/briefs/[id]/edit: concepts read failed — related-concept picker will be empty',
    )
  }

  // Cast via unknown: FK-relation join correct at runtime; generator doesn't
  // always detect the concept_briefs.concept_id → concepts.id FK.
  const brief = briefRes.data as unknown as BriefRow & {
    concepts: { name: string } | null
  }
  const allConcepts = (conceptsRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
  }))

  return (
    <BriefEditor
      mode="edit"
      conceptId={brief.concept_id}
      conceptName={brief.concepts?.name}
      initial={{
        title: brief.title,
        bodyMd: brief.body_md,
        gotchas: brief.gotchas ?? [],
        relatedConceptIds: brief.related_concept_ids ?? [],
        diagramUrl: brief.diagram_url,
      }}
      allConcepts={allConcepts}
    />
  )
}
