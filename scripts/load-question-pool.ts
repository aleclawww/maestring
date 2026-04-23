import 'dotenv/config'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { SeedFileSchema, structuralQuality, type SeedQuestion } from '../lib/question-engine/question-schema'

// Loader: reads JSON files from content/seed-questions/ and inserts into `questions`.
// Uses NO LLM tokens — questions are author-generated and versioned in git.
//
// CLI:
//   tsx scripts/load-question-pool.ts                         # load all files
//   tsx scripts/load-question-pool.ts --file=vpc-endpoints    # single file
//   tsx scripts/load-question-pool.ts --dry-run               # parse + validate, no insert
//   tsx scripts/load-question-pool.ts --replace               # delete existing pool-seed rows first

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? 'true']
  })
)

const ONLY_FILE: string | undefined = typeof args['file'] === 'string' ? args['file'] : undefined
const DRY_RUN = args['dry-run'] === 'true'
const REPLACE = args['replace'] === 'true'

const SEED_DIR = join(process.cwd(), 'content', 'seed-questions')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

interface ConceptRow { id: string; slug: string }

async function loadConceptIds(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('concepts')
    .select('id, slug')
    .eq('certification_id', 'aws-saa-c03')
  if (error) throw new Error(`Load concepts failed: ${error.message}`)
  return new Map((data as ConceptRow[]).map(r => [r.slug, r.id]))
}

function buildRow(conceptId: string, q: SeedQuestion) {
  return {
    concept_id: conceptId,
    question_text: q.questionText,
    options: q.options,
    correct_index: q.correctIndex,
    explanation: q.explanation,
    difficulty: q.difficulty,
    question_type: 'multiple_choice' as const,
    source: 'pool-seed',
    is_active: true,
    hint: q.hint ?? null,
    explanation_deep: q.explanationDeep ?? null,
    key_insight: q.keyInsight ?? null,
    scenario_context: q.scenarioContext ?? null,
    tags: q.tags ?? [],
  }
}

async function processFile(path: string, conceptIds: Map<string, string>) {
  const raw = readFileSync(path, 'utf-8')
  const parsed = SeedFileSchema.safeParse(JSON.parse(raw))
  if (!parsed.success) {
    console.error(`✗ ${path}`)
    console.error(parsed.error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n'))
    return { file: path, inserted: 0, skipped: 0, errors: 1 }
  }
  const { conceptSlug, questions } = parsed.data
  const conceptId = conceptIds.get(conceptSlug)
  if (!conceptId) {
    console.error(`✗ ${path}: unknown concept "${conceptSlug}" — run npm run seed first`)
    return { file: path, inserted: 0, skipped: 0, errors: 1 }
  }

  const valid: SeedQuestion[] = []
  let skipped = 0
  questions.forEach((q, idx) => {
    const issues = structuralQuality(q)
    if (issues.length > 0) {
      console.warn(`  skip q[${idx}]: ${issues.map(i => i.code).join(',')}`)
      skipped += 1
    } else {
      valid.push(q)
    }
  })

  if (DRY_RUN) {
    console.log(`  ${conceptSlug}: ${valid.length} valid / ${skipped} skipped (dry-run)`)
    return { file: path, inserted: 0, skipped, errors: 0 }
  }

  if (REPLACE) {
    const { error: delErr } = await supabase
      .from('questions')
      .delete()
      .eq('concept_id', conceptId)
      .eq('source', 'pool-seed')
    if (delErr) {
      console.error(`  delete-fail ${conceptSlug}: ${delErr.message}`)
    }
  }

  const rows = valid.map(q => buildRow(conceptId, q))
  const { error } = await supabase.from('questions').insert(rows)
  if (error) {
    console.error(`  insert-fail ${conceptSlug}: ${error.message}`)
    return { file: path, inserted: 0, skipped, errors: 1 }
  }

  console.log(`  ✓ ${conceptSlug}: inserted=${rows.length} skipped=${skipped}`)
  return { file: path, inserted: rows.length, skipped, errors: 0 }
}

async function main() {
  console.log('\n📥 Loading question pool from JSON')
  console.log(`  dir=${SEED_DIR} dry_run=${DRY_RUN} replace=${REPLACE}`)
  if (ONLY_FILE) console.log(`  only=${ONLY_FILE}`)
  console.log('')

  const files = readdirSync(SEED_DIR)
    .filter(f => f.endsWith('.json'))
    .filter(f => !ONLY_FILE || f === `${ONLY_FILE}.json` || f === ONLY_FILE)
    .map(f => join(SEED_DIR, f))

  if (files.length === 0) {
    console.error('No JSON files found')
    process.exit(1)
  }

  const conceptIds = await loadConceptIds()
  const totals = { inserted: 0, skipped: 0, errors: 0 }

  for (const f of files) {
    const r = await processFile(f, conceptIds)
    totals.inserted += r.inserted
    totals.skipped += r.skipped
    totals.errors += r.errors
  }

  console.log('\n✅ Done')
  console.log(`  files=${files.length} inserted=${totals.inserted} skipped=${totals.skipped} errors=${totals.errors}`)
  if (totals.errors > 0) process.exit(1)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
