import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { createHash } from 'crypto'
import { CONCEPTS } from '../lib/knowledge-graph/aws-saa'
import type { PatternTag } from '../lib/question-engine/templates'

// Free-tier LLM question generator.
//
// Generates new question variants for specific blueprint tasks using a
// free LLM provider. Generated questions are inserted with:
//   source         = 'llm-generated'
//   review_status  = 'needs_review'   (human must approve before serving)
//   is_canonical   = false
//
// Provider priority (first key found in .env.local wins):
//   1. Gemini 2.5 Flash  GEMINI_API_KEY   (free 1500 req/day)
//   2. Groq llama-3.3-70b  GROQ_API_KEY   (free 14k tokens/min)
//
// CLI:
//   tsx scripts/seed-batch-gemini.ts                        # all tasks, 3/task
//   tsx scripts/seed-batch-gemini.ts --task=3.3 --count=10
//   tsx scripts/seed-batch-gemini.ts --concept=elasticache --count=5
//   tsx scripts/seed-batch-gemini.ts --dry-run              # print first prompt
//   tsx scripts/seed-batch-gemini.ts --reset                # delete llm-generated + rerun

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? 'true']
  }),
)

const TARGET_TASK = args['task'] ?? undefined
const TARGET_CONCEPT = args['concept'] ?? undefined
const COUNT_PER_TASK = parseInt(args['count'] ?? '3', 10)
const DRY_RUN = args['dry-run'] === 'true'
const RESET = args['reset'] === 'true'
const MAX_RETRIES = 2

// ─── Provider setup ──────────────────────────────────────────────────────────

type ProviderConfig = { name: string; client: OpenAI; model: string }

function buildClient(): ProviderConfig {
  if (process.env.GEMINI_API_KEY) {
    return {
      name: 'Gemini',
      client: new OpenAI({
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        apiKey: process.env.GEMINI_API_KEY,
      }),
      model: 'gemini-2.0-flash',
    }
  }
  if (process.env.GROQ_API_KEY) {
    return {
      name: 'Groq',
      client: new OpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
      }),
      model: 'llama-3.3-70b-versatile',
    }
  }
  console.error('❌ No LLM API key found. Set GEMINI_API_KEY or GROQ_API_KEY in .env.local')
  console.error('   Gemini free: https://aistudio.google.com/apikey')
  console.error('   Groq free:   https://console.groq.com')
  process.exit(1)
}

// ─── Task → concept mapping ──────────────────────────────────────────────────

const TASK_CONCEPT_PAIRS: Array<{ taskId: string; conceptSlug: string; patternTag: PatternTag }> = [
  { taskId: '1.1', conceptSlug: 'iam-fundamentals',          patternTag: 'most-secure' },
  { taskId: '1.1', conceptSlug: 'scp-organizations',          patternTag: 'most-secure' },
  { taskId: '1.1', conceptSlug: 'cognito',                    patternTag: 'identity-federation' },
  { taskId: '1.2', conceptSlug: 'shield-waf',                 patternTag: 'most-secure' },
  { taskId: '1.2', conceptSlug: 'vpc-fundamentals',           patternTag: 'network-segmentation' },
  { taskId: '1.3', conceptSlug: 'kms-encryption',             patternTag: 'data-encryption' },
  { taskId: '1.3', conceptSlug: 's3-security',                patternTag: 'most-secure' },
  { taskId: '2.1', conceptSlug: 'sqs-vs-sns-vs-eventbridge',  patternTag: 'event-driven-decoupling' },
  { taskId: '2.1', conceptSlug: 'lambda-patterns',            patternTag: 'scalable-elastic' },
  { taskId: '2.2', conceptSlug: 'rds-multi-az',               patternTag: 'highest-availability' },
  { taskId: '2.2', conceptSlug: 'aurora-global',              patternTag: 'dr-rpo-rto' },
  { taskId: '3.1', conceptSlug: 'ebs-volume-types',           patternTag: 'highest-throughput' },
  { taskId: '3.2', conceptSlug: 'ec2-auto-scaling',           patternTag: 'scalable-elastic' },
  { taskId: '3.3', conceptSlug: 'elasticache',                patternTag: 'caching-strategy' },
  { taskId: '3.4', conceptSlug: 'global-accelerator',         patternTag: 'lowest-latency' },
  { taskId: '3.5', conceptSlug: 'athena-fundamentals',        patternTag: 'most-cost-effective' },
  { taskId: '4.1', conceptSlug: 's3-storage-classes',         patternTag: 'most-cost-effective' },
  { taskId: '4.2', conceptSlug: 'savings-plans-strategy',     patternTag: 'most-cost-effective' },
  { taskId: '4.3', conceptSlug: 'aurora-performance',         patternTag: 'most-cost-effective' },
  { taskId: '4.4', conceptSlug: 'vpc-endpoints',              patternTag: 'most-cost-effective' },
]

// ─── Prompt ──────────────────────────────────────────────────────────────────

const VALID_DISTRACTOR_TYPES = [
  'underestimates-availability', 'ignores-cost-in-multi-region', 'confuses-async-with-sync',
  'over-engineers-solution', 'static-when-dynamic-needed', 'manual-when-managed-exists',
  'wrong-storage-tier', 'wrong-encryption-scope', 'iam-user-when-role-needed',
  'public-when-private-needed', 'sync-when-decoupled-needed', 'compute-when-serverless-fits',
  'wrong-region-scope', 'misses-compliance-requirement', 'wrong-rpo-rto-match',
  'over-permissive-iam', 'misuses-caching', 'wrong-load-balancer-type',
  'misses-durability-tier', 'wrong-network-topology', 'monitoring-observability',
]

function buildGenerationPrompt(
  taskId: string,
  conceptSlug: string,
  patternTag: string,
  existingSeeds: string[],
): string {
  const concept = CONCEPTS.find(c => c.slug === conceptSlug)
  const conceptName = concept?.name ?? conceptSlug

  return `You are an expert AWS Solutions Architect exam question writer for the SAA-C03 exam.

Write ONE high-quality multiple-choice question with these constraints:
- Blueprint task: ${taskId}
- AWS concept: ${conceptName} (slug: ${conceptSlug})
- Pattern/theme: ${patternTag}
- The question must be scenario-based (a company/architect faces a challenge)
- Exactly 4 options (one correct, three plausible but wrong distractors)
- Options must be roughly similar in length (avoid obvious tell-tale from length)
- The correct answer must be unambiguously correct per AWS documentation
- Each wrong option must reflect a realistic misconception (not obviously silly)
- DO NOT repeat any of these existing seeds: ${existingSeeds.slice(-5).join(', ') || 'none yet'}

Respond with ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "question_text": "A company needs to... Which solution...?",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "correct_index": 0,
  "explanation": "Option A is correct because... Option B is wrong because... etc.",
  "distractor_types": ["${VALID_DISTRACTOR_TYPES[0]}", "${VALID_DISTRACTOR_TYPES[1]}", "${VALID_DISTRACTOR_TYPES[2]}"],
  "difficulty": 0.55
}

Notes:
- correct_index is 0-based (0=A, 1=B, 2=C, 3=D)
- distractor_types array has 4 entries: null at correct_index, one of [${VALID_DISTRACTOR_TYPES.join(', ')}] at each wrong index
- difficulty is a float 0.0 (trivial) to 1.0 (very hard), SAA-C03 range is typically 0.4-0.7`
}

// ─── Response validation ──────────────────────────────────────────────────────

interface GeneratedQ {
  question_text: string
  options: [string, string, string, string]
  correct_index: 0 | 1 | 2 | 3
  explanation: string
  distractor_types: (string | null)[]
  difficulty: number
}

function validate(raw: unknown): GeneratedQ {
  if (typeof raw !== 'object' || raw === null) throw new Error('Not an object')
  const q = raw as Record<string, unknown>

  if (typeof q['question_text'] !== 'string' || q['question_text'].length < 30)
    throw new Error('question_text missing or too short')
  if (!Array.isArray(q['options']) || q['options'].length !== 4)
    throw new Error('options must be array of 4')
  for (const o of q['options'] as unknown[])
    if (typeof o !== 'string' || (o as string).length < 5)
      throw new Error('option too short')
  if (typeof q['correct_index'] !== 'number' || ![0,1,2,3].includes(q['correct_index']))
    throw new Error('correct_index must be 0-3')
  if (typeof q['explanation'] !== 'string' || q['explanation'].length < 20)
    throw new Error('explanation missing or too short')
  if (!Array.isArray(q['distractor_types']) || q['distractor_types'].length !== 4)
    throw new Error('distractor_types must be array of 4')
  if (q['distractor_types'][q['correct_index'] as number] !== null)
    throw new Error('distractor_types[correct_index] must be null')
  const diff = typeof q['difficulty'] === 'number' ? q['difficulty'] : 0.55
  if (diff < 0 || diff > 1) throw new Error('difficulty out of range')

  return {
    question_text: q['question_text'] as string,
    options: q['options'] as [string, string, string, string],
    correct_index: q['correct_index'] as 0 | 1 | 2 | 3,
    explanation: q['explanation'] as string,
    distractor_types: q['distractor_types'] as (string | null)[],
    difficulty: diff,
  }
}

function parseResponse(content: string): GeneratedQ {
  // Strip markdown code fences if present
  const stripped = content.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  const parsed = JSON.parse(stripped) as unknown
  return validate(parsed)
}

function variationSeed(taskId: string, conceptSlug: string, questionText: string): string {
  const h = createHash('sha1').update(`${taskId}:${conceptSlug}:${questionText}`).digest('hex').slice(0, 10)
  return `llm:${taskId}:${h}`
}

// ─── LLM call with retry ──────────────────────────────────────────────────────

async function generate(
  provider: ProviderConfig,
  prompt: string,
): Promise<GeneratedQ> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await provider.client.chat.completions.create({
        model: provider.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.7,
      })
      const content = resp.choices[0]?.message?.content ?? ''
      return parseResponse(content)
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)))
    }
  }
  throw new Error('unreachable')
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

async function main() {
  const provider = buildClient()
  console.log(`🤖 seed-batch-gemini  provider=${provider.name}  model=${provider.model}`)

  // Filter target pairs
  let pairs = TASK_CONCEPT_PAIRS
  if (TARGET_TASK) pairs = pairs.filter(p => p.taskId === TARGET_TASK)
  if (TARGET_CONCEPT) pairs = pairs.filter(p => p.conceptSlug === TARGET_CONCEPT)
  if (pairs.length === 0) { console.error('❌ No matching task/concept pairs'); process.exit(1) }

  // Load concept IDs
  const { data: concepts } = await supabase.from('concepts').select('id, slug').eq('certification_id', 'aws-saa-c03')
  const conceptIdBySlug = new Map((concepts ?? []).map(c => [c.slug as string, c.id as string]))

  // Load existing seeds to avoid duplicates
  const { data: existing } = await supabase.from('questions').select('variation_seed').eq('source', 'llm-generated')
  const existingSeeds = new Set((existing ?? []).map(r => r.variation_seed as string))

  if (RESET) {
    console.log('→ --reset: deleting llm-generated rows…')
    const { count } = await supabase.from('questions').delete({ count: 'exact' }).eq('source', 'llm-generated')
    console.log(`✓ Deleted ${count ?? 0} rows`)
    existingSeeds.clear()
  }

  if (DRY_RUN) {
    const pair = pairs[0]!
    const existingSeedsList = [...existingSeeds]
    console.log('\n--dry-run: printing first prompt\n')
    console.log(buildGenerationPrompt(pair.taskId, pair.conceptSlug, pair.patternTag, existingSeedsList))
    return
  }

  let inserted = 0, skipped = 0, failed = 0
  const existingSeedsList = [...existingSeeds]

  for (const pair of pairs) {
    const conceptId = conceptIdBySlug.get(pair.conceptSlug)
    if (!conceptId) { console.warn(`  ⚠ Unknown concept ${pair.conceptSlug} — skipping`); continue }

    console.log(`\n→ Task ${pair.taskId}  concept=${pair.conceptSlug}  generating ${COUNT_PER_TASK}…`)

    for (let i = 0; i < COUNT_PER_TASK; i++) {
      const prompt = buildGenerationPrompt(pair.taskId, pair.conceptSlug, pair.patternTag, existingSeedsList)
      try {
        const q = await generate(provider, prompt)
        const seed = variationSeed(pair.taskId, pair.conceptSlug, q.question_text)

        if (existingSeeds.has(seed)) { skipped++; process.stdout.write('  s'); continue }

        const row = {
          concept_id: conceptId,
          question_text: q.question_text,
          options: q.options,
          correct_index: q.correct_index,
          explanation: q.explanation,
          difficulty: q.difficulty,
          question_type: 'multiple_choice' as const,
          source: 'llm-generated',
          is_active: true,
          review_status: 'needs_review' as const,
          pattern_tag: pair.patternTag,
          is_canonical: false,
          variation_seed: seed,
          expected_distractor_type: q.distractor_types,
          blueprint_task_id: pair.taskId,
        }

        const { error } = await supabase.from('questions').insert(row)
        if (error) { failed++; process.stdout.write('  ✗'); continue }

        existingSeeds.add(seed)
        existingSeedsList.push(seed)
        inserted++
        process.stdout.write('  ✓')
      } catch (err) {
        failed++
        process.stdout.write(`  ✗(${err instanceof Error ? err.message.slice(0, 40) : '?'})`)
      }

      // Rate limit buffer
      if (i < COUNT_PER_TASK - 1) await new Promise(r => setTimeout(r, 1200))
    }
    console.log()
  }

  console.log(`\n✅ Done: ${inserted} inserted  ${skipped} skipped  ${failed} failed`)
  console.log(`\nNext: review with  tsx scripts/review-flagged.ts`)
}

main().catch(err => { console.error('Unhandled:', err); process.exit(1) })
