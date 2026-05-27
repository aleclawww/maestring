import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

/**
 * Marks every `source='templated'` question whose text fails the structural
 * audit (short, no question structure) as review_status='needs_review' so
 * the runtime selector stops serving it.
 *
 * Reversible:
 *   UPDATE questions
 *     SET review_status = 'approved'
 *   WHERE source = 'templated' AND review_status = 'needs_review';
 *
 * CLI:
 *   tsx scripts/mark-flagged-needs-review.ts --dry-run
 *   tsx scripts/mark-flagged-needs-review.ts          (writes)
 */

const DRY = process.argv.includes('--dry-run')

const supa = createClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { persistSession: false } },
)

const INTERROGATIVES = /\b(which|what|how|why|when|where|who|whose|whom|does|do|is|are|can|should|would|will)\b/i
// AWS-exam-style imperative verbs (anchored at start to avoid mid-sentence noise)
const IMPERATIVE_START = /^\s*(select|choose|pick|identify|determine|design|configure|implement|deploy|build|secure|optimi[sz]e|reduce|mitigate|achieve|cut|surface|define|provision|architect|recommend|propose)\b/i
// Scenario cue inside the body of a longer sentence
const SCENARIO_CUE = /\b(must|should|needs? to|requires?|wants? to|LEAST|MOST|minimize|maximize|ensure|without|across|while)\b/

;(async () => {
  const all: { id: string; question_text: string; source: string; review_status: string }[] = []
  let from = 0
  while (true) {
    const { data } = await supa.from('questions')
      .select('id, question_text, source, review_status')
      .range(from, from + 999)
    if (!data?.length) break
    all.push(...(data as any))
    if (data.length < 1000) break
    from += 1000
  }

  const flagged = all.filter(q => {
    if (q.source !== 'templated') return false
    if (q.review_status !== 'approved') return false
    const t = (q.question_text ?? '').trim()
    const words = t.split(/\s+/).filter(Boolean).length
    const isLongScenario = t.length >= 120 || words >= 20
    return !isLongScenario && !INTERROGATIVES.test(t) && !IMPERATIVE_START.test(t) && !SCENARIO_CUE.test(t)
  })

  console.log(`Will mark ${flagged.length} templated questions as needs_review`)
  console.log(`Sample of 3:`)
  flagged.slice(0, 3).forEach(q => console.log('  -', q.question_text))

  if (DRY) {
    console.log('\n--dry-run: no writes')
    return
  }

  let done = 0
  for (let i = 0; i < flagged.length; i += 100) {
    const chunk = flagged.slice(i, i + 100).map(q => q.id)
    const { error } = await supa
      .from('questions')
      .update({ review_status: 'needs_review' })
      .in('id', chunk)
    if (error) {
      console.error('Update failed:', error.message)
      process.exit(1)
    }
    done += chunk.length
    process.stdout.write(`  ${done}/${flagged.length}\r`)
  }
  console.log(`\n✓ Marked ${done} questions as needs_review`)

  // Coverage check after
  const { data: post } = await supa
    .from('questions')
    .select('concept_id, review_status, is_active')
  const approved = (post ?? []).filter((q: any) => q.is_active && q.review_status === 'approved')
  const perConcept = new Map<string, number>()
  for (const q of approved) perConcept.set((q as any).concept_id, (perConcept.get((q as any).concept_id) ?? 0) + 1)
  console.log(`\nPost-update: ${approved.length} approved questions across ${perConcept.size} concepts`)
})()
