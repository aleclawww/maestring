import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CERTIFICATION_ID } from '@/lib/knowledge-graph/aws-saa'

export const dynamic = 'force-dynamic'

// Returns one pool question per domain (max one per domain). The wizard shows
// these as a quick diagnostic — correct/wrong on each shifts the self-report
// by ±1 before seeding. If the pool is too thin to cover every domain the
// endpoint simply returns fewer items; the UI degrades gracefully and the
// self-report alone is used.
export async function GET() {
  await requireAuthenticatedUser()
  const admin = createAdminClient()

  const { data: domains } = await admin
    .from('knowledge_domains')
    .select('id, slug, name')
    .eq('certification_id', CERTIFICATION_ID)
    .order('sort_order', { ascending: true })

  if (!domains?.length) return NextResponse.json({ data: { questions: [] } })

  const { data: concepts } = await admin
    .from('concepts')
    .select('id, slug, name, domain_id, difficulty')
    .eq('certification_id', CERTIFICATION_ID)
    .eq('is_active', true)

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
    const { data: rows } = await admin
      .from('questions')
      .select('id, question_text, options, correct_index, concept_id, difficulty')
      .in('concept_id', domainConcepts.map(c => c.id))
      .eq('is_active', true)
      .eq('source', 'pool-seed')
      .gte('difficulty', 0.2)
      .lte('difficulty', 0.55)
      .limit(20)

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
