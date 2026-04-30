import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { QuestionsAdminClient } from './client'

export const dynamic = 'force-dynamic'

export default async function QuestionsAdminPage() {
  const supabase = createAdminClient()

  // Pool size per concept (approved only) so the admin knows where the queue is thinnest.
  // Silent failure on any of these four reads renders an empty admin panel that's
  // indistinguishable from "there's genuinely nothing pending" — the admin then
  // doesn't triage the review queue (pending piles up, users see stale pool). Log
  // warn per read so a broken RLS policy or DB hiccup can be correlated to
  // "admin says there's nothing to review, but the pool is growing".
  const { data: concepts, error: conceptsErr } = await supabase
    .from('concepts')
    .select('id, slug, name')
    .order('name')
  if (conceptsErr) {
    logger.warn(
      { err: conceptsErr },
      'admin/questions: failed to read concepts — sidebar will show no concepts'
    )
  }

  // Pull recent questions grouped by status. Cap the list so the page stays light.
  const { data: pending, error: pendingErr } = await supabase
    .from('questions')
    .select('id, concept_id, question_text, options, correct_index, explanation, difficulty, review_status, created_at, source')
    .eq('review_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(100)
  if (pendingErr) {
    logger.warn(
      { err: pendingErr },
      'admin/questions: failed to read pending queue — review queue will appear empty, AI-generated pool may pile up un-approved'
    )
  }

  const { data: rejected, error: rejectedErr } = await supabase
    .from('questions')
    .select('id, concept_id, question_text, options, correct_index, explanation, difficulty, review_status, created_at, reject_reason')
    .eq('review_status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(30)
  if (rejectedErr) {
    logger.warn(
      { err: rejectedErr },
      'admin/questions: failed to read rejected list — rejection history hidden'
    )
  }

  // Pool counts per concept (approved only) for the sidebar.
  // Uses an aggregate GROUP BY query to avoid fetching every row to the server
  // for an in-memory count — the previous approach scanned the whole table and
  // transferred tens of thousands of concept_id strings to Node.js.
  const { data: countRows, error: countsErr } = await supabase
    .from('questions')
    .select('concept_id, count:concept_id.count()')
    .eq('review_status', 'approved')
    .eq('is_active', true)
  if (countsErr) {
    logger.warn(
      { err: countsErr },
      'admin/questions: failed to read approved counts — sidebar will show 0 for every concept, masking which concepts need refill'
    )
  }

  const countByConcept = new Map<string, number>()
  for (const row of countRows ?? []) {
    const r = row as { concept_id: string; count: number }
    countByConcept.set(r.concept_id, Number(r.count))
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
