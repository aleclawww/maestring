import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { CERTIFICATION_ID } from '@/lib/knowledge-graph/aws-saa'
import { BriefEditor } from '../BriefEditor'

export const dynamic = 'force-dynamic'

export default async function NewBriefPage() {
  const supabase = createAdminClient()

  // All concepts in the cert + the set of concepts that already have a brief.
  // Both reads in parallel; keep going on partial failure (warn the operator).
  const briefsPromise = supabase
    .from('concept_briefs')
    .select('concept_id')
  const conceptsPromise = supabase
    .from('concepts')
    .select('id, name, slug')
    .eq('certification_id', CERTIFICATION_ID)
    .order('name')

  const [briefsRes, conceptsRes] = await Promise.all([
    briefsPromise,
    conceptsPromise,
  ])

  if (briefsRes.error) {
    logger.warn(
      { err: briefsRes.error },
      'admin/briefs/new: failed to read existing briefs — every concept will appear available',
    )
  }
  if (conceptsRes.error) {
    logger.warn(
      { err: conceptsRes.error },
      'admin/briefs/new: failed to read concepts — picker will be empty',
    )
  }

  const allConcepts = (conceptsRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
  }))
  const briefedIds = new Set<string>(
    ((briefsRes.data ?? []) as Array<{ concept_id: string }>).map(
      (b) => b.concept_id,
    ),
  )
  const availableConcepts = allConcepts.filter((c) => !briefedIds.has(c.id))

  return (
    <BriefEditor
      mode="new"
      conceptId={null}
      initial={{
        title: '',
        bodyMd: '',
        gotchas: [],
        relatedConceptIds: [],
        diagramUrl: null,
      }}
      allConcepts={allConcepts}
      availableConcepts={availableConcepts}
    />
  )
}
