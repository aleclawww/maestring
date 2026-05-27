import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supa = createClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { persistSession: false } },
)

;(async () => {
  const { data: concepts } = await supa
    .from('concepts')
    .select('id, slug, name')
    .eq('certification_id', 'aws-saa-c03')

  const { data: qs } = await supa
    .from('questions')
    .select('concept_id, source, review_status, is_active')

  const stats = new Map<string, { all: number; usable_without_templated: number }>()
  for (const c of concepts ?? []) stats.set(c.id, { all: 0, usable_without_templated: 0 })

  for (const q of qs ?? []) {
    const s = stats.get(q.concept_id)
    if (!s) continue
    if (q.is_active && q.review_status === 'approved') {
      s.all++
      if (q.source !== 'templated') s.usable_without_templated++
    }
  }

  let zero = 0, lowCount = 0
  const zeroList: string[] = []
  for (const c of concepts ?? []) {
    const s = stats.get(c.id)!
    if (s.usable_without_templated === 0) {
      zero++
      zeroList.push(`  ${c.slug.padEnd(35)} (had ${s.all - s.usable_without_templated} templated)`)
    } else if (s.usable_without_templated < 3) {
      lowCount++
    }
  }
  console.log(`Concepts with ZERO approved questions if we remove templated: ${zero} / ${concepts?.length}`)
  console.log(`Concepts with <3 questions:                                    ${lowCount}`)
  console.log('\nZero-coverage concepts (would fall back to static-generator):')
  console.log(zeroList.join('\n'))
})()
