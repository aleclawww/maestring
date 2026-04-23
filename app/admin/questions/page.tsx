import { createAdminClient } from '@/lib/supabase/admin'
import { QuestionsAdminClient } from './client'

export const dynamic = 'force-dynamic'

export default async function QuestionsAdminPage() {
  const supabase = createAdminClient()

  // Pool size per concept (approved only) so the admin knows where the queue is thinnest.
  const { data: concepts } = await supabase
    .from('concepts')
    .select('id, slug, name')
    .order('name')

  // Pull recent questions grouped by status. Cap the list so the page stays light.
  const { data: pending } = await supabase
    .from('questions')
    .select('id, concept_id, question_text, options, correct_index, explanation, difficulty, review_status, created_at, source')
    .eq('review_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: rejected } = await supabase
    .from('questions')
    .select('id, concept_id, question_text, options, correct_index, explanation, difficulty, review_status, created_at, reject_reason')
    .eq('review_status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(30)

  // Pool counts per concept (approved only) for the sidebar.
  const { data: counts } = await supabase
    .from('questions')
    .select('concept_id')
    .eq('review_status', 'approved')
    .eq('is_active', true)

  const countByConcept = new Map<string, number>()
  for (const row of counts ?? []) {
    const id = (row as { concept_id: string }).concept_id
    countByConcept.set(id, (countByConcept.get(id) ?? 0) + 1)
  }

  const conceptList = (concepts ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    approvedCount: countByConcept.get(c.id) ?? 0,
  }))

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-1">Question Pool</h1>
      <p className="text-sm text-text-muted mb-6">
        Review AI-generated questions before they reach users. Approved → served from pool. Rejected → disabled.
      </p>

      <QuestionsAdminClient
        concepts={conceptList}
        pending={(pending ?? []) as never}
        rejected={(rejected ?? []) as never}
      />
    </div>
  )
}
