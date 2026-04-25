import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

// Difficulty calibration: adjust questions.difficulty based on real user
// attempt data from the question_attempts table.
//
// Algorithm:
//   observed_accuracy = correct_attempts / total_attempts
//   new_difficulty    = 1 - observed_accuracy   (0=trivial, 1=impossible)
//   Weighted blend:   new = α * observed + (1-α) * current  (α=0.6)
//   Minimum attempts: skip questions with < MIN_ATTEMPTS data points.
//
// CLI:
//   tsx scripts/calibrate-difficulty.ts              # update all with ≥10 attempts
//   tsx scripts/calibrate-difficulty.ts --dry-run    # report changes, no DB write
//   tsx scripts/calibrate-difficulty.ts --min=5      # lower threshold
//   tsx scripts/calibrate-difficulty.ts --alpha=0.8  # heavier weight on observed
//   tsx scripts/calibrate-difficulty.ts --domain=3   # one domain only

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? 'true']
  }),
)

const DRY_RUN = args['dry-run'] === 'true'
const MIN_ATTEMPTS = parseInt(args['min'] ?? '10', 10)
const ALPHA = parseFloat(args['alpha'] ?? '0.6')      // weight on observed
const DOMAIN_FILTER = args['domain'] ?? undefined
const MAX_DELTA = 0.3   // never shift difficulty by more than this in one run

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

interface AttemptRow {
  question_id: string
  is_correct: boolean
}

interface QuestionRow {
  id: string
  difficulty: number
  blueprint_task_id: string | null
  source: string
}

interface CalibrationResult {
  id: string
  blueprintTaskId: string | null
  source: string
  totalAttempts: number
  observedAccuracy: number
  currentDifficulty: number
  newDifficulty: number
  delta: number
}

async function main() {
  console.log(`📐 calibrate-difficulty  min=${MIN_ATTEMPTS}  α=${ALPHA}  dry-run=${DRY_RUN}`)

  // 1. Load all approved questions
  let qQuery = supabase
    .from('questions')
    .select('id, difficulty, blueprint_task_id, source')
    .eq('review_status', 'approved')
    .eq('is_active', true)

  if (DOMAIN_FILTER) qQuery = qQuery.like('blueprint_task_id', `${DOMAIN_FILTER}.%`)

  const { data: questions, error: qErr } = await qQuery
  if (qErr) { console.error('❌ Questions load failed:', qErr.message); process.exit(1) }
  const questionMap = new Map<string, QuestionRow>()
  for (const q of questions ?? []) questionMap.set(q.id, q as QuestionRow)

  console.log(`✓ Loaded ${questionMap.size} questions`)

  // 2. Aggregate attempts per question
  const { data: attempts, error: aErr } = await supabase
    .from('question_attempts')
    .select('question_id, is_correct')

  if (aErr) { console.error('❌ Attempts load failed:', aErr.message); process.exit(1) }

  const stats = new Map<string, { total: number; correct: number }>()
  for (const a of (attempts ?? []) as AttemptRow[]) {
    if (!questionMap.has(a.question_id)) continue
    const s = stats.get(a.question_id) ?? { total: 0, correct: 0 }
    s.total++
    if (a.is_correct) s.correct++
    stats.set(a.question_id, s)
  }

  console.log(`✓ Found attempt data for ${stats.size} questions`)

  // 3. Compute calibration
  const results: CalibrationResult[] = []

  for (const [id, s] of stats) {
    if (s.total < MIN_ATTEMPTS) continue
    const q = questionMap.get(id)!
    const observedAccuracy = s.correct / s.total
    const observedDifficulty = 1 - observedAccuracy

    // Blend with current value, clamped
    const blended = ALPHA * observedDifficulty + (1 - ALPHA) * q.difficulty
    const clamped = Math.max(0.1, Math.min(0.95, blended))
    const delta = clamped - q.difficulty

    if (Math.abs(delta) < 0.02) continue  // ignore negligible changes

    results.push({
      id,
      blueprintTaskId: q.blueprint_task_id,
      source: q.source,
      totalAttempts: s.total,
      observedAccuracy,
      currentDifficulty: q.difficulty,
      newDifficulty: parseFloat(clamped.toFixed(3)),
      delta: parseFloat(delta.toFixed(3)),
    })
  }

  console.log(`✓ ${results.length} questions qualify for recalibration (≥${MIN_ATTEMPTS} attempts, Δ≥0.02)`)

  if (results.length === 0) {
    const totalAttempts = [...stats.values()].reduce((a, b) => a + b.total, 0)
    console.log(`\n  Total question_attempts in DB: ${totalAttempts}`)
    console.log(`  ${stats.size} questions have any attempt data`)
    console.log(`  None meet the ${MIN_ATTEMPTS}-attempt threshold for calibration yet.`)
    console.log(`  Re-run after users have completed more study sessions.`)
    return
  }

  // Print summary
  const easierCount = results.filter(r => r.delta < 0).length
  const harderCount = results.filter(r => r.delta > 0).length
  const avgDelta = results.reduce((a, b) => a + Math.abs(b.delta), 0) / results.length

  console.log(`\n📊 Calibration summary:`)
  console.log(`  ${easierCount} questions become easier (users found them too hard)`)
  console.log(`  ${harderCount} questions become harder (users found them too easy)`)
  console.log(`  Average |Δ| = ${avgDelta.toFixed(3)}`)

  // Per-domain breakdown
  const byDomain: Record<string, { n: number; avgDelta: number }> = {}
  for (const r of results) {
    const d = r.blueprintTaskId?.split('.')[0] ?? 'unknown'
    if (!byDomain[d]) byDomain[d] = { n: 0, avgDelta: 0 }
    byDomain[d]!.n++
    byDomain[d]!.avgDelta += Math.abs(r.delta)
  }
  console.log('\nPer-domain:')
  for (const [d, s] of Object.entries(byDomain).sort()) {
    console.log(`  D${d}: ${s.n} questions  avg|Δ|=${( s.avgDelta / s.n).toFixed(3)}`)
  }

  // Top 10 biggest changes
  const top = [...results].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 10)
  console.log('\nTop 10 biggest adjustments:')
  for (const r of top) {
    const dir = r.delta > 0 ? '↑ harder' : '↓ easier'
    const acc = (r.observedAccuracy * 100).toFixed(0)
    console.log(`  [${r.blueprintTaskId}] ${r.source.padEnd(14)} ${r.currentDifficulty.toFixed(2)} → ${r.newDifficulty.toFixed(2)} ${dir}  (acc=${acc}%  n=${r.totalAttempts})`)
  }

  if (DRY_RUN) {
    console.log('\n--dry-run: no DB writes')
    return
  }

  // 4. Apply updates
  console.log(`\n→ Updating ${results.length} questions…`)
  let updated = 0

  // Cap delta and chunk updates
  const capped = results.map(r => ({
    id: r.id,
    difficulty: parseFloat(
      Math.max(
        r.currentDifficulty - MAX_DELTA,
        Math.min(r.currentDifficulty + MAX_DELTA, r.newDifficulty),
      ).toFixed(3),
    ),
  }))

  for (let i = 0; i < capped.length; i += 100) {
    const chunk = capped.slice(i, i + 100)
    for (const item of chunk) {
      const { error } = await supabase
        .from('questions')
        .update({ difficulty: item.difficulty })
        .eq('id', item.id)
      if (error) console.error(`  ❌ ${item.id}: ${error.message}`)
      else updated++
    }
    process.stdout.write(`  ${updated}/${capped.length}\r`)
  }

  console.log(`\n✅ Updated difficulty on ${updated} questions`)
}

main().catch(err => { console.error('Unhandled:', err); process.exit(1) })
