import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

/**
 * Cross-check every approved question against Claude Sonnet (4.6).
 * Sonnet is a stronger, different model from Haiku (which we use for
 * generation), so a disagreement is a genuine second-opinion signal.
 *
 * On disagreement: the question gets `review_status='needs_review'` so
 * the runtime selector stops serving it until a human reviews. A safety
 * cap prevents mass-flagging if Sonnet itself appears wrong.
 *
 * CLI:
 *   tsx scripts/qa-crosscheck-sonnet.ts                       # all approved
 *   tsx scripts/qa-crosscheck-sonnet.ts --sample=50           # random 50
 *   tsx scripts/qa-crosscheck-sonnet.ts --source=templated    # only templated
 *   tsx scripts/qa-crosscheck-sonnet.ts --dry-run             # print first prompt only
 *   tsx scripts/qa-crosscheck-sonnet.ts --no-db-update        # report-only
 *   tsx scripts/qa-crosscheck-sonnet.ts --flag-threshold=0.3  # safety cap (default 0.5)
 *   tsx scripts/qa-crosscheck-sonnet.ts --rps=2               # requests/sec
 */

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? 'true']
  }),
)

const SAMPLE = args['sample'] ? parseInt(args['sample'], 10) : undefined
const DOMAIN = args['domain'] as string | undefined
const SOURCE = args['source'] as string | undefined
const DRY_RUN = args['dry-run'] === 'true'
const NO_DB_UPDATE = args['no-db-update'] === 'true'
const FLAG_THRESHOLD = args['flag-threshold'] ? parseFloat(args['flag-threshold']) : 0.5
const RPS = args['rps'] ? parseFloat(args['rps']) : 2
const MODEL = args['model'] ?? 'claude-sonnet-4-6'

if (!process.env['ANTHROPIC_API_KEY']) {
  console.error('Missing ANTHROPIC_API_KEY in .env.local')
  process.exit(1)
}

const anthropic = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY']! })
const supabase = createClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  { auth: { persistSession: false } },
)

interface DBQuestion {
  id: string
  question_text: string
  options: string[]
  correct_index: number
  source: string
  blueprint_task_id: string | null
  variation_seed: string | null
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

function buildPrompt(q: DBQuestion): string {
  const letters = ['A', 'B', 'C', 'D']
  const optionLines = q.options.map((o, i) => `${letters[i]}) ${o}`).join('\n')
  return `You are an AWS Certified Solutions Architect — Associate (SAA-C03) exam expert.

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
  const m = raw.trim().match(/^[ABCDabcd]/)
  if (!m) return null
  return 'ABCD'.indexOf(m[0]!.toUpperCase())
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

async function checkOne(q: DBQuestion, retries = 2): Promise<CheckResult> {
  const prompt = buildPrompt(q)
  let raw = ''
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
      })
      const block = resp.content[0]
      raw = block && block.type === 'text' ? block.text.trim() : ''
      break
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      const transient = /rate.?limit|overloaded|529|429|timeout/i.test(msg)
      if (attempt < retries && transient) {
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
        error: msg,
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

async function main() {
  console.log(`qa-crosscheck-sonnet  model=${MODEL}  rps=${RPS}`)

  let query = supabase
    .from('questions')
    .select('id, question_text, options, correct_index, source, blueprint_task_id, variation_seed')
    .eq('review_status', 'approved')
    .eq('is_active', true)

  if (SOURCE) query = query.eq('source', SOURCE)
  if (DOMAIN) query = query.like('blueprint_task_id', `${DOMAIN}.%`)

  const { data, error } = await query
  if (error) {
    console.error('DB load failed:', error.message)
    process.exit(1)
  }
  let pool = (data ?? []) as DBQuestion[]
  if (SAMPLE && pool.length > SAMPLE) {
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
    }
    pool = pool.slice(0, SAMPLE)
  }
  console.log(`Loaded ${pool.length} questions to check`)

  if (DRY_RUN) {
    console.log('\n--dry-run: first prompt below\n')
    console.log(buildPrompt(pool[0]!))
    return
  }

  const delayMs = Math.round(1000 / RPS)
  const results: CheckResult[] = []
  let agreed = 0, disagreed = 0, errored = 0

  for (let i = 0; i < pool.length; i++) {
    const r = await checkOne(pool[i]!)
    results.push(r)
    if (r.error) errored++
    else if (r.agreed) agreed++
    else disagreed++
    process.stdout.write(`  [${i + 1}/${pool.length}] ${agreed}✓ ${disagreed}✗ ${errored}?      \r`)
    if (i < pool.length - 1) await sleep(delayMs)
  }
  console.log('\n')

  const total = results.length
  const agreeRate = (agreed / total) * 100
  console.log(`Results: ${agreed}/${total} agreed (${agreeRate.toFixed(1)}%)  ${disagreed} disagreements  ${errored} errors`)

  const byDomain: Record<string, { agree: number; total: number }> = {}
  const bySource: Record<string, { agree: number; total: number }> = {}
  for (const r of results) {
    const d = r.blueprintTaskId?.split('.')[0] ?? 'unknown'
    byDomain[d] ??= { agree: 0, total: 0 }
    byDomain[d]!.total++
    if (r.agreed) byDomain[d]!.agree++
    bySource[r.source] ??= { agree: 0, total: 0 }
    bySource[r.source]!.total++
    if (r.agreed) bySource[r.source]!.agree++
  }
  console.log('\nPer-domain agreement:')
  for (const d of Object.keys(byDomain).sort()) {
    const v = byDomain[d]!
    console.log(`  D${d}: ${v.agree}/${v.total} = ${((v.agree / v.total) * 100).toFixed(1)}%`)
  }
  console.log('\nPer-source agreement:')
  for (const s of Object.keys(bySource).sort()) {
    const v = bySource[s]!
    console.log(`  ${s.padEnd(18)} ${v.agree}/${v.total} = ${((v.agree / v.total) * 100).toFixed(1)}%`)
  }

  const disagreements = results.filter(r => !r.agreed && !r.error)
  if (disagreements.length > 0) {
    console.log(`\n${disagreements.length} disagreements (Our vs Sonnet):`)
    const letters = ['A', 'B', 'C', 'D']
    disagreements.slice(0, 15).forEach(r => {
      console.log(
        `  [${r.blueprintTaskId ?? '?'}] ${r.source}\n` +
        `    Q: ${r.question_text.slice(0, 100)}\n` +
        `    Our: ${letters[r.correct_index]} | Sonnet: ${r.llm_index !== null ? letters[r.llm_index] : '?'} (raw="${r.raw_response}")\n`,
      )
    })
    if (disagreements.length > 15) console.log(`  ... and ${disagreements.length - 15} more (see JSON report)`)
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const reportPath = path.join(process.cwd(), 'data', `qa-report-sonnet-${ts}.json`)
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    model: MODEL,
    total, agreed, disagreed, errored,
    agreementRate: parseFloat(agreeRate.toFixed(2)),
    byDomain, bySource,
    disagreements: disagreements.map(r => ({
      id: r.id, variationSeed: r.variationSeed, blueprintTaskId: r.blueprintTaskId, source: r.source,
      question_text: r.question_text, correct_index: r.correct_index, llm_index: r.llm_index, raw_response: r.raw_response,
    })),
    errors: results.filter(r => r.error).map(r => ({ id: r.id, error: r.error })),
  }, null, 2))
  console.log(`\nReport: ${path.relative(process.cwd(), reportPath)}`)

  const flagIds = disagreements.map(r => r.id)
  if (NO_DB_UPDATE) {
    console.log('\n--no-db-update: skipping DB writes')
    return
  }
  if (flagIds.length === 0) {
    console.log('\nNo disagreements to flag — pool is clean.')
    return
  }
  const flagRate = disagreements.length / total
  if (flagRate > FLAG_THRESHOLD) {
    console.log(
      `\nDisagreement rate ${(flagRate * 100).toFixed(1)}% exceeds threshold ${(FLAG_THRESHOLD * 100).toFixed(0)}% — skipping DB update.\n` +
      `Re-run with --flag-threshold=1 to force.`,
    )
    return
  }
  console.log(`\nFlagging ${flagIds.length} questions as needs_review…`)
  for (let i = 0; i < flagIds.length; i += 100) {
    const chunk = flagIds.slice(i, i + 100)
    const { error: upErr } = await supabase
      .from('questions')
      .update({ review_status: 'needs_review' })
      .in('id', chunk)
    if (upErr) console.error(`  Update batch ${i}: ${upErr.message}`)
  }
  console.log(`Flagged ${flagIds.length}`)
}

main().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
