import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// QA cross-check: submit each question to Groq (free LLM) and flag
// answers where the LLM disagrees with our stored correct_index.
//
// A disagreement does NOT mean the question is wrong — Groq might be
// wrong. But a high disagreement rate on a cluster of questions signals
// a review is worth doing. Flagged questions get review_status='needs_review'.
//
// Setup: add GROQ_API_KEY to .env.local
//   Free tier: https://console.groq.com  (14k tokens/min, 1k req/day on llama-3.1-8b)
//
// CLI:
//   tsx scripts/qa-crosscheck-groq.ts                   # all approved questions
//   tsx scripts/qa-crosscheck-groq.ts --sample=50       # random 50
//   tsx scripts/qa-crosscheck-groq.ts --domain=1        # domain 1 only
//   tsx scripts/qa-crosscheck-groq.ts --source=canonical
//   tsx scripts/qa-crosscheck-groq.ts --dry-run         # print first prompt, no calls
//   tsx scripts/qa-crosscheck-groq.ts --flag-threshold=0.6  # flag if confidence <60%
//   tsx scripts/qa-crosscheck-groq.ts --no-db-update    # report only, no DB writes

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? 'true']
  }),
)

const SAMPLE = args['sample'] ? parseInt(args['sample'], 10) : undefined
const DOMAIN = args['domain'] ?? undefined
const SOURCE = args['source'] ?? undefined  // 'canonical' | 'templated'
const DRY_RUN = args['dry-run'] === 'true'
const NO_DB_UPDATE = args['no-db-update'] === 'true'
const FLAG_THRESHOLD = args['flag-threshold'] ? parseFloat(args['flag-threshold']) : 0.5
// Requests per second to stay within Groq free-tier limits (30 rpm = 0.5 rps)
const RPS = args['rps'] ? parseFloat(args['rps']) : 0.4
const MODEL = args['model'] ?? 'llama-3.1-8b-instant'

if (!process.env.GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY not set in .env.local')
  console.error('   Get a free key at https://console.groq.com')
  process.exit(1)
}

const groq = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

// ─── Types ───────────────────────────────────────────────────────────────────

interface DBQuestion {
  id: string
  question_text: string
  options: string[]
  correct_index: number
  source: string
  blueprint_task_id: string | null
  variation_seed: string | null
  review_status: string
}

interface CheckResult {
  id: string
  variationSeed: string | null
  blueprintTaskId: string | null
  source: string
  question_text: string
  correct_index: number
  llm_index: number | null
  agreed: boolean
  raw_response: string
  error?: string
}

// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildPrompt(q: DBQuestion): string {
  const letters = ['A', 'B', 'C', 'D']
  const optionLines = q.options
    .map((o, i) => `${letters[i]}) ${o}`)
    .join('\n')

  return `You are an AWS Certified Solutions Architect - Associate exam expert.

Question:
${q.question_text}

Options:
${optionLines}

Instructions:
- Identify the single best answer according to AWS documentation and SAA-C03 exam objectives.
- Reply with ONLY a single letter: A, B, C, or D.
- Do not explain. Do not add any other text.`
}

function parseLetter(raw: string): number | null {
  const match = raw.trim().match(/^[Aa]|^[Bb]|^[Cc]|^[Dd]/)
  if (!match) return null
  return 'ABCD'.indexOf(match[0].toUpperCase())
}

// ─── Rate-limiter ─────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function checkOne(q: DBQuestion, retries = 2): Promise<CheckResult> {
  const prompt = buildPrompt(q)
  let raw = ''

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await groq.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4,
        temperature: 0,
      })
      raw = resp.choices[0]?.message?.content?.trim() ?? ''
      break
    } catch (err: unknown) {
      const isRateLimit =
        err instanceof Error && err.message.toLowerCase().includes('rate limit')
      if (attempt < retries && isRateLimit) {
        await sleep(3000 * (attempt + 1))
        continue
      }
      return {
        id: q.id,
        variationSeed: q.variation_seed,
        blueprintTaskId: q.blueprint_task_id,
        source: q.source,
        question_text: q.question_text,
        correct_index: q.correct_index,
        llm_index: null,
        agreed: false,
        raw_response: '',
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  const llm_index = parseLetter(raw)
  return {
    id: q.id,
    variationSeed: q.variation_seed,
    blueprintTaskId: q.blueprint_task_id,
    source: q.source,
    question_text: q.question_text,
    correct_index: q.correct_index,
    llm_index,
    agreed: llm_index === q.correct_index,
    raw_response: raw,
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🔍 qa-crosscheck-groq  model=${MODEL}  rps=${RPS}`)

  // 1. Load questions from DB
  let query = supabase
    .from('questions')
    .select('id, question_text, options, correct_index, source, blueprint_task_id, variation_seed, review_status')
    .eq('review_status', 'approved')
    .eq('is_active', true)

  if (SOURCE) query = query.eq('source', SOURCE)
  if (DOMAIN) query = query.like('blueprint_task_id', `${DOMAIN}.%`)

  const { data: questions, error } = await query
  if (error) { console.error('❌ DB load failed:', error.message); process.exit(1) }

  let pool = (questions ?? []) as DBQuestion[]

  if (SAMPLE && pool.length > SAMPLE) {
    // Fisher-Yates shuffle then slice
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
    }
    pool = pool.slice(0, SAMPLE)
  }

  console.log(`✓ Loaded ${pool.length} questions to check`)

  if (DRY_RUN) {
    console.log('\n--dry-run: printing first prompt\n')
    console.log(buildPrompt(pool[0]!))
    return
  }

  // 2. Check each question
  const results: CheckResult[] = []
  const delayMs = Math.round(1000 / RPS)
  let agreed = 0, disagreed = 0, errored = 0

  for (let i = 0; i < pool.length; i++) {
    const q = pool[i]!
    const result = await checkOne(q)
    results.push(result)

    if (result.error) {
      errored++
      process.stdout.write(`  [${i + 1}/${pool.length}] ❓ ERROR ${result.error.slice(0, 60)}\r`)
    } else if (result.agreed) {
      agreed++
      process.stdout.write(`  [${i + 1}/${pool.length}] ✓ ${agreed}✓ ${disagreed}✗ ${errored}?   \r`)
    } else {
      disagreed++
      process.stdout.write(`  [${i + 1}/${pool.length}] ✗ DISAGREE task=${result.blueprintTaskId} seed=${result.variationSeed?.slice(0, 20)}\r`)
    }

    if (i < pool.length - 1) await sleep(delayMs)
  }

  console.log('\n')

  // 3. Summary
  const total = results.length
  const agreeRate = ((agreed / total) * 100).toFixed(1)
  console.log(`\n📊 Results: ${agreed}/${total} agreed (${agreeRate}%)  ${disagreed} disagreements  ${errored} errors`)

  // Per-domain breakdown
  const byDomain: Record<string, { agree: number; total: number }> = {}
  for (const r of results) {
    const d = r.blueprintTaskId?.split('.')[0] ?? 'unknown'
    if (!byDomain[d]) byDomain[d] = { agree: 0, total: 0 }
    byDomain[d]!.total++
    if (r.agreed) byDomain[d]!.agree++
  }
  console.log('\nPer-domain agreement:')
  for (const d of Object.keys(byDomain).sort()) {
    const { agree, total: t } = byDomain[d]!
    console.log(`  D${d}: ${agree}/${t} = ${((agree / t) * 100).toFixed(1)}%`)
  }

  // Disagreement list
  const disagreements = results.filter(r => !r.agreed && !r.error)
  if (disagreements.length > 0) {
    console.log(`\n⚠️  ${disagreements.length} disagreements (our answer vs LLM answer):`)
    disagreements.slice(0, 15).forEach(r => {
      const letters = ['A', 'B', 'C', 'D']
      console.log(
        `  [${r.blueprintTaskId}] ${r.source} seed=${r.variationSeed?.slice(0, 18) ?? r.id.slice(0, 8)}\n` +
        `    Q: ${r.question_text.slice(0, 80)}...\n` +
        `    Our: ${letters[r.correct_index]} | LLM: ${r.llm_index !== null ? letters[r.llm_index] : '?'} (raw="${r.raw_response}")\n`,
      )
    })
    if (disagreements.length > 15) {
      console.log(`  ... and ${disagreements.length - 15} more (see JSON report)`)
    }
  }

  // 4. Write JSON report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const reportPath = path.join(process.cwd(), 'data', `qa-report-${timestamp}.json`)
  const report = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    total,
    agreed,
    disagreed,
    errored,
    agreementRate: parseFloat(agreeRate),
    byDomain,
    disagreements: disagreements.map(r => ({
      id: r.id,
      variationSeed: r.variationSeed,
      blueprintTaskId: r.blueprintTaskId,
      source: r.source,
      question_text: r.question_text,
      correct_index: r.correct_index,
      llm_index: r.llm_index,
      raw_response: r.raw_response,
    })),
    errors: results.filter(r => r.error).map(r => ({ id: r.id, error: r.error })),
  }
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n📄 Report written to ${path.relative(process.cwd(), reportPath)}`)

  // 5. Flag disagreements in DB
  const flagIds = disagreements.map(r => r.id)
  if (!NO_DB_UPDATE && flagIds.length > 0) {
    const flagRate = disagreements.length / total
    if (flagRate > FLAG_THRESHOLD) {
      console.log(
        `\n⚠️  Disagreement rate ${(flagRate * 100).toFixed(1)}% exceeds flag-threshold ` +
        `${(FLAG_THRESHOLD * 100).toFixed(0)}% — skipping DB update to avoid mass-flagging.` +
        `\nRe-run with --no-db-update or --flag-threshold=1 to force.`,
      )
    } else {
      console.log(`\n→ Flagging ${flagIds.length} questions as needs_review…`)
      for (let i = 0; i < flagIds.length; i += 100) {
        const chunk = flagIds.slice(i, i + 100)
        const { error: upErr } = await supabase
          .from('questions')
          .update({ review_status: 'needs_review' })
          .in('id', chunk)
        if (upErr) console.error(`  ❌ Update batch ${i}: ${upErr.message}`)
      }
      console.log(`✓ Flagged ${flagIds.length} questions for human review`)
    }
  } else if (NO_DB_UPDATE) {
    console.log('\n--no-db-update: skipping DB writes')
  }
}

main().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
