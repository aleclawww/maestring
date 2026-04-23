import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Drill-down for the "at risk" chip on ReadinessCard. Returns concepts
// scheduled within 7 days with stability < 14d, ordered by urgency
// (next_review_date asc). Capped so the drawer stays compact.
export async function GET() {
  const user = await requireAuthenticatedUser()
  const supabase = createAdminClient()

  const horizon = new Date(Date.now() + 7 * 86_400_000).toISOString()

  const { data, error } = await supabase
    .from('user_concept_states')
    .select(
      'concept_id, stability, lapses, reps, next_review_date, ' +
      'concepts!inner(id, slug, name, domain_id, knowledge_domains!inner(name))'
    )
    .eq('user_id', user.id)
    .eq('concepts.certification_id', 'aws-saa-c03')
    .lt('stability', 14)
    .lte('next_review_date', horizon)
    .not('next_review_date', 'is', null)
    .order('next_review_date', { ascending: true })
    .limit(20)

  if (error) {
    logger.error({ err: error, userId: user.id }, 'at-risk query failed')
    return NextResponse.json({ error: 'Failed to load at-risk concepts' }, { status: 500 })
  }

  type Row = {
    concept_id: string
    stability: number | null
    lapses: number | null
    reps: number | null
    next_review_date: string | null
    concepts: {
      id: string
      slug: string
      name: string
      domain_id: string
      knowledge_domains: { name: string } | { name: string }[]
    }
  }

  const items = (data as unknown as Row[] | null ?? []).map(r => {
    const kd = r.concepts.knowledge_domains
    const domainName = Array.isArray(kd) ? kd[0]?.name ?? null : kd?.name ?? null
    return {
      conceptId: r.concept_id,
      slug: r.concepts.slug,
      name: r.concepts.name,
      domainName,
      domainId: r.concepts.domain_id,
      stability: Number(r.stability ?? 0),
      lapses: r.lapses ?? 0,
      reps: r.reps ?? 0,
      nextReviewDate: r.next_review_date,
    }
  })

  return NextResponse.json({ data: { items } })
}
