import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { TEMPLATES, expandAll, summarizeExpansion } from '../lib/question-engine/templates'

// Templated question seeder.
//
// Walks `lib/question-engine/templates.ts`, expands every template into
// concrete variants (cartesian product of slot values, optionally pruned
// by per-template filter), validates structurally, and inserts with:
//   source         = 'templated'
//   is_canonical   = false
//   review_status  = 'approved'        (validation pass = ready)
//   variation_seed = '<tpl-id>:<sha10>' (stable across runs)
//
// Idempotent — duplicates by variation_seed are skipped.
//
// Optional weight rebalancing: --rebalance picks a subset whose
// per-domain distribution matches official SAA-C03 weights (30/26/24/20)
// rather than emitting all variants. Useful when a starter template set
// over-produces in one domain.
//
// CLI:
//   tsx scripts/seed-from-templates.ts                # insert all variants
//   tsx scripts/seed-from-templates.ts --rebalance    # pick weight-balanced subset
//   tsx scripts/seed-from-templates.ts --target=200   # cap total emitted
//   tsx scripts/seed-from-templates.ts --reset        # wipe templated rows + reinsert
//   tsx scripts/seed-from-templates.ts --dry-run      # validate only

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? 'true']
  }),
)
const RESET = args['reset'] === 'true'
const DRY_RUN = args['dry-run'] === 'true'
const REBALANCE = args['rebalance'] === 'true'
const TARGET = args['target'] ? parseInt(args['target'], 10) : undefined

const OFFICIAL_WEIGHTS: Record<string, number> = {
  '1': 0.30,
  '2': 0.26,
  '3': 0.24,
  '4': 0.20,
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

function structuralValidate(qs: ReturnType<typeof expandAll>): string[] {
  const errors: string[] = []
  for (const q of qs) {
    if (q.options.length !== 4) errors.push(`${q.variationSeed}: expected 4 options`)
    if (q.correctIndex < 0 || q.correctIndex > 3) errors.push(`${q.variationSeed}: bad correctIndex`)
    if (q.expectedDistractorType.length !== 4) errors.push(`${q.variationSeed}: distractor array must be length 4`)
    if (q.expectedDistractorType[q.correctIndex] !== null) {
      errors.push(`${q.variationSeed}: distractor at correctIndex must be null`)
    }
    for (let i = 0; i < 4; i++) {
      if (i !== q.correctIndex && q.expectedDistractorType[i] === null) {
        errors.push(`${q.variationSeed}: distractor missing at index ${i}`)
      }
    }
    // Templated "umbrella correct" options are naturally longer because
    // they enumerate the service-to-pattern mapping in one line. Loosen
    // the parity bounds vs. seed-canonical (which uses 0.4-1.8 because
    // its options are intentionally parallel).
    const lens = q.options.map(o => o.length)
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length
    for (let i = 0; i < lens.length; i++) {
      const ratio = lens[i]! / mean
      if (ratio < 0.3 || ratio > 2.5) {
        errors.push(`${q.variationSeed}: option ${i} length ratio ${ratio.toFixed(2)} (out of [0.3,2.5])`)
      }
    }
    const seen = new Set(q.options.map(o => o.trim().toLowerCase()))
    if (seen.size !== 4) errors.push(`${q.variationSeed}: duplicate options after normalisation`)
  }
  return errors
}

// Greedy weight-aware sampler: pick variants round-robin across domains,
// preferring domains that are below their target ratio. Stops at `target`.
function rebalanceToWeights(
  expanded: ReturnType<typeof expandAll>,
  target: number,
): ReturnType<typeof expandAll> {
  const buckets: Record<string, ReturnType<typeof expandAll>> = { '1': [], '2': [], '3': [], '4': [] }
  for (const q of expanded) {
    const d = q.blueprintTaskId.split('.')[0] ?? '1'
    if (buckets[d]) buckets[d]!.push(q)
  }

  const goal: Record<string, number> = {
    '1': Math.round(target * OFFICIAL_WEIGHTS['1']!),
    '2': Math.round(target * OFFICIAL_WEIGHTS['2']!),
    '3': Math.round(target * OFFICIAL_WEIGHTS['3']!),
    '4': target - Math.round(target * OFFICIAL_WEIGHTS['1']!) - Math.round(target * OFFICIAL_WEIGHTS['2']!) - Math.round(target * OFFICIAL_WEIGHTS['3']!),
  }

  const out: ReturnType<typeof expandAll> = []
  for (const d of ['1', '2', '3', '4'] as const) {
    const want = goal[d]!
    const have = buckets[d]!
    out.push(...have.slice(0, Math.min(want, have.length)))
  }
  return out
}

async function main() {
  console.log(`🌱 seed-from-templates: ${TEMPLATES.length} templates`)

  console.log('→ Expanding templates…')
  const expanded = expandAll(TEMPLATES)
  const summary = summarizeExpansion(expanded)
  console.log(`✓ Expanded to ${summary.total} variants`)
  console.log(`  Per task: ${JSON.stringify(summary.perTask)}`)
  console.log(`  Per domain: ${JSON.stringify(summary.perDomain)}`)

  console.log('\n→ Validating…')
  const errors = structuralValidate(expanded)
  if (errors.length) {
    console.error(`❌ Validation failed (${errors.length}):`)
    errors.slice(0, 20).forEach(e => console.error('  -', e))
    if (errors.length > 20) console.error(`  ... and ${errors.length - 20} more`)
    process.exit(1)
  }
  console.log(`✓ All ${expanded.length} variants pass structural validation`)

  let toEmit = expanded
  if (REBALANCE) {
    const tgt = TARGET ?? Math.min(expanded.length, 200)
    toEmit = rebalanceToWeights(expanded, tgt)
    const reSummary = summarizeExpansion(toEmit)
    console.log(`\n→ Rebalanced to ${reSummary.total} variants matching official weights`)
    console.log(`  Per domain: ${JSON.stringify(reSummary.perDomain)}`)
  } else if (TARGET) {
    toEmit = expanded.slice(0, TARGET)
    console.log(`\n→ Capped to ${toEmit.length} variants`)
  }

  if (DRY_RUN) {
    console.log('\n--dry-run: stopping before DB writes')
    return
  }

  console.log('\n→ Loading concept ids…')
  const { data: concepts, error: cErr } = await supabase
    .from('concepts')
    .select('id, slug')
    .eq('certification_id', 'aws-saa-c03')
  if (cErr) {
    console.error('❌ Concept load failed:', cErr.message)
    process.exit(1)
  }
  const conceptIdBySlug = new Map<string, string>(
    (concepts ?? []).map(c => [c.slug as string, c.id as string]),
  )
  console.log(`✓ Loaded ${conceptIdBySlug.size} concepts`)

  for (const q of toEmit) {
    if (!conceptIdBySlug.has(q.conceptSlug)) {
      console.error(`❌ Unknown concept slug: ${q.conceptSlug} (in ${q.variationSeed})`)
      process.exit(1)
    }
  }

  if (RESET) {
    console.log('→ --reset: deleting existing templated rows…')
    const { error: delErr, count } = await supabase
      .from('questions')
      .delete({ count: 'exact' })
      .eq('source', 'templated')
    if (delErr) {
      console.error('❌ Delete failed:', delErr.message)
      process.exit(1)
    }
    console.log(`✓ Deleted ${count ?? 0} templated rows`)
  }

  let existingSeeds = new Set<string>()
  if (!RESET) {
    const seeds = toEmit.map(q => q.variationSeed)
    // Postgres has a parameter limit; chunk the IN list.
    for (let i = 0; i < seeds.length; i += 200) {
      const chunk = seeds.slice(i, i + 200)
      const { data: ex } = await supabase
        .from('questions')
        .select('variation_seed')
        .eq('source', 'templated')
        .in('variation_seed', chunk)
      for (const r of ex ?? []) {
        if (r.variation_seed) existingSeeds.add(r.variation_seed)
      }
    }
  }

  const toInsert = toEmit
    .filter(q => !existingSeeds.has(q.variationSeed))
    .map(q => ({
      concept_id: conceptIdBySlug.get(q.conceptSlug)!,
      question_text: q.questionText,
      options: q.options,
      correct_index: q.correctIndex,
      explanation: q.explanation,
      difficulty: q.difficulty,
      question_type: 'multiple_choice' as const,
      source: 'templated',
      is_active: true,
      review_status: 'approved' as const,
      pattern_tag: q.patternTag,
      is_canonical: false,
      variation_seed: q.variationSeed,
      expected_distractor_type: q.expectedDistractorType,
      blueprint_task_id: q.blueprintTaskId,
    }))

  if (toInsert.length === 0) {
    console.log('✓ All templated rows already present — nothing to do (use --reset to wipe)')
    return
  }

  console.log(`\n→ Inserting ${toInsert.length} templated questions…`)
  let inserted = 0
  for (let i = 0; i < toInsert.length; i += 50) {
    const chunk = toInsert.slice(i, i + 50)
    const { error } = await supabase.from('questions').insert(chunk)
    if (error) {
      console.error(`\n❌ Insert batch ${i}: ${error.message}`)
      process.exit(1)
    }
    inserted += chunk.length
    process.stdout.write(`  ${inserted}/${toInsert.length}\r`)
  }
  console.log(`\n✓ Inserted ${inserted} templated questions`)

  // Coverage report (combined canonical + templated).
  const finalSummary = summarizeExpansion(toEmit)
  console.log(`\n📋 Templated coverage emitted:`)
  for (const tid of Object.keys(finalSummary.perTask).sort()) {
    console.log(`   Task ${tid}: ${finalSummary.perTask[tid]}`)
  }
  const total = finalSummary.total
  console.log(`\n📊 Distribution (target 30/26/24/20):`)
  for (const d of ['1', '2', '3', '4']) {
    const c = finalSummary.perDomain[d] ?? 0
    console.log(`   Domain ${d}: ${c} / ${total} = ${((c / total) * 100).toFixed(1)}%`)
  }
}

main().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
