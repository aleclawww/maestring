import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CERTIFICATION_ID } from '@/lib/knowledge-graph/aws-saa'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Returns one pool question per domain (max one per domain). The wizard shows
// these as a quick diagnostic — correct/wrong on each shifts the self-report
// by ±1 before seeding. If the pool is too thin to cover every domain the
// endpoint simply returns fewer items; the UI degrades gracefully and the
// self-report alone is used.
export async function GET() {
  const user = await requireAuthenticatedUser()
  const admin = createAdminClient()

  // Silent failure on the domains read collapsed into the same "return
  // empty" branch as a legitimate empty seed. The onboarding wizard then
  // renders the self-report-only fallback, the user completes without any
  // diagnostic adjustment, and we end up with a less-accurate cognitive
  // fingerprint — a downstream quality hit we can't tell apart from a
  // genuinely thin pool. Log warn so RLS/DB incidents don't look like
  // "pool too small".
  const { data: domains, error: domainsErr } = await admin
    .from('knowledge_domains')
    .select('id, slug, name')
    .eq('certification_id', CERTIFICATION_ID)
    .order('sort_order', { ascending: true })
  if (domainsErr) {
    logger.warn(
      { err: domainsErr, userId: user.id, certificationId: CERTIFICATION_ID },
      'diagnostic: failed to read knowledge_domains — returning empty diagnostic, self-report-only fallback'
    )
  }

  if (!domains?.length) return NextResponse.json({ data: { questions: [] } })

  const { data: concepts, error: conceptsErr } = await admin
    .from('concepts')
    .select('id, slug, name, domain_id, difficulty')
    .eq('certification_id', CERTIFICATION_ID)
    .eq('is_active', true)
  if (conceptsErr) {
    logger.warn(
      { err: conceptsErr, userId: user.id, certificationId: CERTIFICATION_ID },
      'diagnostic: failed to read concepts — returning empty diagnostic, self-report-only fallback'
    )
  }

  if (!concepts?.length) return NextResponse.json({ data: { questions: [] } })

  const picked: Array<{
    domainSlug: string
    domainId: string
    conceptId: string
    conceptName: string
    questionId: string
    questionText: string
    options: string[]
    correctIndex: number
  }> = []

  for (const domain of domains) {
    const domainConcepts = concepts.filter(c => c.domain_id === domain.id)
    // Pool-seeded questions are marked source='pool-seed'; difficulty band is
    // wide so the diagnostic samples across easy/medium/hard, not just hard.
    // Silent failure on this read skipped the domain (continue) and made the
    // diagnostic under-cover the knowledge graph — the user got fewer than
    // one question per domain, the calibration was weaker, and we had no
    // way to tell a real "thin pool" from an RLS hiccup. Log warn per-domain
    // so gaps in the diagnostic coverage are attributable.
    const { data: rows, error: rowsErr } = await admin
      .from('questions')
      .select('id, question_text, options, correct_index, concept_id, difficulty')
      .in('concept_id', domainConcepts.map(c => c.id))
      .eq('is_active', true)
      .eq('source', 'pool-seed')
      .gte('difficulty', 0.2)
      .lte('difficulty', 0.55)
      .limit(20)
    if (rowsErr) {
      logger.warn(
        { err: rowsErr, userId: user.id, domainSlug: domain.slug, domainId: domain.id },
        'diagnostic: failed to read pool questions for domain — skipping, calibration will be weaker'
      )
    }

    if (!rows?.length) continue

    const pick = rows[Math.floor(Math.random() * rows.length)]!
    const concept = domainConcepts.find(c => c.id === pick.concept_id)
    picked.push({
      domainSlug: domain.slug,
      domainId: domain.id,
      conceptId: pick.concept_id,
      conceptName: concept?.name ?? '',
      questionId: pick.id,
      questionText: pick.question_text,
      options: pick.options as string[],
      correctIndex: pick.correct_index,
    })
  }

  return NextResponse.json({ data: { questions: picked } })
}
