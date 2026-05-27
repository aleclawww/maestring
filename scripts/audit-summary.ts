import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supa = createClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { persistSession: false } },
)

const INTERROGATIVES = /\b(which|what|how|why|when|where|who|whose|whom|does|do|is|are|can|should|would|will)\b/i
const IMPERATIVE = /\b(select|choose|pick|identify|determine)\b/i
const SCENARIO_CUE = /\b(must|should|needs? to|requires?|wants? to|LEAST|MOST|minimize|maximize|ensure|without)\b/

;(async () => {
  const all: any[] = []
  let from = 0
  while (true) {
    const { data } = await supa.from('questions')
      .select('id, source, review_status, question_text, options, concept_id')
      .range(from, from + 999)
    if (!data?.length) break
    all.push(...data)
    if (data.length < 1000) break
    from += 1000
  }

  const flagged = all.filter(q => {
    const t = (q.question_text ?? '').trim()
    const words = t.split(/\s+/).filter(Boolean).length
    const isLongScenario = t.length >= 120 || words >= 20
    return !isLongScenario && !INTERROGATIVES.test(t) && !IMPERATIVE.test(t) && !SCENARIO_CUE.test(t)
  })

  const bySource: Record<string, { total: number; flagged: number }> = {}
  for (const q of all) {
    const s = q.source ?? 'null'
    bySource[s] ??= { total: 0, flagged: 0 }
    bySource[s].total++
  }
  for (const q of flagged) {
    const s = q.source ?? 'null'
    bySource[s]!.flagged++
  }

  console.log('Flagged (severity 3 — no question structure) by source:')
  for (const [s, v] of Object.entries(bySource)) {
    console.log(`  ${s.padEnd(20)} ${v.flagged}/${v.total}  (${(v.flagged / v.total * 100).toFixed(0)}%)`)
  }

  // group flagged by concept
  const conceptIds = [...new Set(flagged.map(q => q.concept_id))]
  const { data: concepts } = await supa.from('concepts').select('id, slug').in('id', conceptIds)
  const cmap = new Map((concepts ?? []).map(c => [c.id, c.slug]))
  const byConcept: Record<string, number> = {}
  for (const q of flagged) {
    const slug = cmap.get(q.concept_id) ?? 'unknown'
    byConcept[slug] = (byConcept[slug] ?? 0) + 1
  }
  console.log('\nTop concepts with flagged questions:')
  Object.entries(byConcept).sort((a, b) => b[1] - a[1]).slice(0, 15)
    .forEach(([slug, n]) => console.log(`  ${n.toString().padStart(3)}  ${slug}`))

  // option-quality: avg word count in options
  const optStats = { allShort: 0, anyAcronym: 0 }
  for (const q of all) {
    const opts: string[] = Array.isArray(q.options) ? q.options : []
    const wc = opts.map(o => (o ?? '').trim().split(/\s+/).filter(Boolean).length)
    if (wc.length && wc.every(w => w <= 2)) optStats.allShort++
    if (opts.some(o => /^[A-Z0-9]{1,4}$/.test((o ?? '').trim()))) optStats.anyAcronym++
  }
  console.log('\nOption-text quality:')
  console.log(`  all 4 options ≤2 words:  ${optStats.allShort}/${all.length}`)
  console.log(`  any option is bare acronym (S3, EBS…): ${optStats.anyAcronym}/${all.length}`)
})()
