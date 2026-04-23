import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { CERTIFICATION_ID, CONCEPTS, type ConceptDefinition } from '../lib/knowledge-graph/aws-saa'
import { formatQuestionPrompt } from '../lib/question-engine/prompts'
import { validateQuestion, type CandidateQuestion } from '../lib/question-engine/validator'

// CLI:
//   tsx scripts/seed-question-pool.ts                         (full run: all concepts)
//   tsx scripts/seed-question-pool.ts --concept=s3-lifecycle  (single concept dry-run)
//   tsx scripts/seed-question-pool.ts --per-difficulty=5
//   tsx scripts/seed-question-pool.ts --dry-run               (no DB insert)
//   tsx scripts/seed-question-pool.ts --concurrency=4

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? 'true']
  })
)

const ONLY_CONCEPT: string | undefined = typeof args['concept'] === 'string' ? args['concept'] : undefined
const PER_DIFFICULTY = Number(args['per-difficulty'] ?? 10)
const CONCURRENCY = Number(args['concurrency'] ?? 4)
const DRY_RUN = args['dry-run'] === 'true'
const DIFFICULTIES: Array<{ label: string; value: number }> = [
  { label: 'easy', value: 0.3 },
  { label: 'medium', value: 0.6 },
  { label: 'hard', value: 0.85 },
]

const GENERATOR_MODEL = process.env.ANTHROPIC_MODEL_GENERATOR ?? 'claude-haiku-4-5-20251001'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

function extractJSON(text: string): unknown {
  try {
    return JSON.parse(text.trim())
  } catch {}
  const block = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (block?.[1]) {
    try {
      return JSON.parse(block[1].trim())
    } catch {}
  }
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first !== -1 && last !== -1) {
    try {
      return JSON.parse(text.slice(first, last + 1))
    } catch {}
  }
  throw new Error('no_json')
}

async function generateOne(concept: ConceptDefinition, difficulty: number): Promise<CandidateQuestion | null> {
  const prompt = formatQuestionPrompt(concept, [], difficulty, 'review')
  try {
    const res = await anthropic.messages.create({
      model: GENERATOR_MODEL,
      max_tokens: 1024,
      temperature: 0.8,
      messages: [{ role: 'user', content: prompt }],
    })
    const content = res.content[0]
    if (!content || content.type !== 'text') return null
    const raw = extractJSON(content.text) as Record<string, unknown>
    if (
      typeof raw['questionText'] !== 'string' ||
      !Array.isArray(raw['options']) ||
      (raw['options'] as unknown[]).length !== 4 ||
      typeof raw['correctIndex'] !== 'number' ||
      typeof raw['explanation'] !== 'string'
    ) {
      return null
    }
    return {
      questionText: raw['questionText'] as string,
      options: raw['options'] as string[],
      correctIndex: raw['correctIndex'] as number,
      explanation: raw['explanation'] as string,
      difficulty: typeof raw['difficulty'] === 'number' ? (raw['difficulty'] as number) : difficulty,
    }
  } catch (err) {
    console.warn(`  gen-fail ${concept.slug}@${difficulty}: ${(err as Error).message}`)
    return null
  }
}

async function runBatch<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size)
    const out = await Promise.all(chunk.map(fn))
    results.push(...out)
  }
  return results
}

interface ConceptRow {
  id: string
  slug: string
}

async function loadConceptIds(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('concepts')
    .select('id, slug')
    .eq('certification_id', CERTIFICATION_ID)
  if (error) throw new Error(`Load concepts failed: ${error.message}`)
  return new Map((data as ConceptRow[]).map(r => [r.slug, r.id]))
}

async function seedConcept(
  concept: ConceptDefinition,
  conceptId: string
): Promise<{ attempted: number; validated: number; inserted: number }> {
  let attempted = 0
  let validated = 0
  let inserted = 0

  for (const diff of DIFFICULTIES) {
    const tasks = Array.from({ length: PER_DIFFICULTY }, () => diff.value)
    const candidates = await runBatch(tasks, CONCURRENCY, v => generateOne(concept, v))
    attempted += tasks.length

    const valid: CandidateQuestion[] = []
    for (const c of candidates) {
      if (!c) continue
      const result = await validateQuestion(concept, c)
      if (result.valid) {
        valid.push(c)
        validated += 1
      } else {
        console.warn(`  reject ${concept.slug}@${diff.label}: ${result.reasons.slice(0, 3).join(',')}`)
      }
    }

    if (!DRY_RUN && valid.length > 0) {
      const rows = valid.map(v => ({
        concept_id: conceptId,
        question_text: v.questionText,
        options: v.options,
        correct_index: v.correctIndex,
        explanation: v.explanation,
        difficulty: v.difficulty,
        question_type: 'multiple_choice' as const,
        source: 'pool-seed',
        is_active: true,
      }))
      const { error } = await supabase.from('questions').insert(rows)
      if (error) {
        console.error(`  insert-fail ${concept.slug}@${diff.label}: ${error.message}`)
      } else {
        inserted += rows.length
      }
    }

    console.log(
      `  ${concept.slug} @${diff.label}: attempted=${tasks.length} valid=${valid.length} inserted=${DRY_RUN ? 'dry' : valid.length}`
    )
  }

  return { attempted, validated, inserted }
}

async function main() {
  console.log('\n🌱 Seeding question pool')
  console.log(`  model=${GENERATOR_MODEL}`)
  console.log(`  per_difficulty=${PER_DIFFICULTY} concurrency=${CONCURRENCY} dry_run=${DRY_RUN}`)
  if (ONLY_CONCEPT) console.log(`  only=${ONLY_CONCEPT}`)
  console.log('')

  const targets = ONLY_CONCEPT ? CONCEPTS.filter(c => c.slug === ONLY_CONCEPT) : CONCEPTS
  if (targets.length === 0) {
    console.error(`No concept matches slug "${ONLY_CONCEPT}"`)
    process.exit(1)
  }

  const conceptIds = await loadConceptIds()
  const missing = targets.filter(c => !conceptIds.has(c.slug))
  if (missing.length > 0) {
    console.error(`Concepts not in DB (run npm run seed first): ${missing.map(m => m.slug).join(', ')}`)
    process.exit(1)
  }

  let totals = { attempted: 0, validated: 0, inserted: 0 }
  const started = Date.now()

  for (const concept of targets) {
    const id = conceptIds.get(concept.slug)!
    console.log(`→ ${concept.slug} (${concept.name})`)
    const r = await seedConcept(concept, id)
    totals.attempted += r.attempted
    totals.validated += r.validated
    totals.inserted += r.inserted
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1)
  console.log('\n✅ Done')
  console.log(`  concepts=${targets.length}`)
  console.log(`  attempted=${totals.attempted} validated=${totals.validated} inserted=${totals.inserted}`)
  console.log(`  validation_rate=${((totals.validated / Math.max(1, totals.attempted)) * 100).toFixed(1)}%`)
  console.log(`  elapsed=${elapsed}s`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
