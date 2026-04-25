import 'dotenv/config'
import * as readline from 'readline'
import { createClient } from '@supabase/supabase-js'

// Interactive CLI to review questions flagged as needs_review.
//
// Sources of needs_review questions:
//   - qa-crosscheck-groq.ts (LLM disagreements)
//   - seed-batch-gemini.ts  (all LLM-generated need human sign-off)
//
// CLI:
//   tsx scripts/review-flagged.ts              # interactive review
//   tsx scripts/review-flagged.ts --list       # list flagged, no interaction
//   tsx scripts/review-flagged.ts --source=llm-generated
//   tsx scripts/review-flagged.ts --task=3.3
//   tsx scripts/review-flagged.ts --stats      # summary counts only
//
// Interactive commands per question:
//   a / y   → approve   (review_status = 'approved')
//   r / d   → reject    (review_status = 'rejected')
//   0-3     → fix correct_index, then auto-approve
//   s / n   → skip (leave as needs_review)
//   q       → quit

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? 'true']
  }),
)

const LIST_ONLY = args['list'] === 'true'
const STATS_ONLY = args['stats'] === 'true'
const SOURCE_FILTER = args['source'] ?? undefined
const TASK_FILTER = args['task'] ?? undefined
const LIMIT = args['limit'] ? parseInt(args['limit'], 10) : 200

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

interface DBQuestion {
  id: string
  question_text: string
  options: string[]
  correct_index: number
  explanation: string
  source: string
  blueprint_task_id: string | null
  variation_seed: string | null
  difficulty: number
  pattern_tag: string | null
}

function prompt(rl: readline.Interface, q: string): Promise<string> {
  return new Promise(resolve => rl.question(q, resolve))
}

function renderQuestion(q: DBQuestion, idx: number, total: number): void {
  const letters = ['A', 'B', 'C', 'D']
  console.log('\n' + '─'.repeat(72))
  console.log(`[${idx + 1}/${total}]  task=${q.blueprint_task_id ?? '?'}  source=${q.source}  diff=${q.difficulty.toFixed(2)}`)
  console.log(`seed: ${q.variation_seed ?? q.id}`)
  console.log('\n' + q.question_text + '\n')
  q.options.forEach((o, i) => {
    const mark = i === q.correct_index ? '✓' : ' '
    console.log(`  ${mark} ${letters[i]}) ${o}`)
  })
  if (q.explanation) {
    console.log('\n📖 ' + q.explanation.slice(0, 200) + (q.explanation.length > 200 ? '…' : ''))
  }
  console.log('\n  [a]pprove  [r]eject  [0-3] fix answer  [s]kip  [q]uit')
}

async function main() {
  // Load flagged questions
  let query = supabase
    .from('questions')
    .select('id, question_text, options, correct_index, explanation, source, blueprint_task_id, variation_seed, difficulty, pattern_tag')
    .eq('review_status', 'needs_review')
    .order('source', { ascending: true })
    .order('blueprint_task_id', { ascending: true })
    .limit(LIMIT)

  if (SOURCE_FILTER) query = query.eq('source', SOURCE_FILTER)
  if (TASK_FILTER) query = query.eq('blueprint_task_id', TASK_FILTER)

  const { data, error } = await query
  if (error) { console.error('❌ DB error:', error.message); process.exit(1) }
  const questions = (data ?? []) as DBQuestion[]

  if (questions.length === 0) {
    console.log('✅ No questions in needs_review — queue is clear!')
    return
  }

  // Stats mode
  if (STATS_ONLY) {
    const bySource: Record<string, number> = {}
    const byTask: Record<string, number> = {}
    for (const q of questions) {
      bySource[q.source] = (bySource[q.source] ?? 0) + 1
      const t = q.blueprint_task_id ?? 'unknown'
      byTask[t] = (byTask[t] ?? 0) + 1
    }
    console.log(`\n📋 needs_review queue: ${questions.length} questions`)
    console.log('\nBy source:')
    Object.entries(bySource).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}`))
    console.log('\nBy task:')
    Object.entries(byTask).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}`))
    return
  }

  // List mode
  if (LIST_ONLY) {
    console.log(`\n📋 ${questions.length} questions in needs_review:\n`)
    questions.forEach((q, i) => {
      console.log(`${i + 1}. [${q.blueprint_task_id ?? '?'}] ${q.source}  ${q.question_text.slice(0, 80)}…`)
    })
    return
  }

  // Interactive review
  console.log(`\n🔍 Reviewing ${questions.length} flagged questions…`)
  console.log('Press Ctrl+C to abort without saving current question.\n')

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  let approved = 0, rejected = 0, corrected = 0, skipped = 0

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]!
    renderQuestion(q, i, questions.length)

    let handled = false
    while (!handled) {
      const answer = (await prompt(rl, '> ')).trim().toLowerCase()

      if (answer === 'q') {
        console.log(`\n👋 Quit. Approved ${approved}, rejected ${rejected}, corrected ${corrected}, skipped ${skipped}.`)
        rl.close()
        return
      }

      if (answer === 'a' || answer === 'y') {
        await supabase.from('questions').update({ review_status: 'approved' }).eq('id', q.id)
        approved++
        console.log('  ✅ Approved')
        handled = true
      } else if (answer === 'r' || answer === 'd') {
        await supabase.from('questions').update({ review_status: 'rejected' }).eq('id', q.id)
        rejected++
        console.log('  ❌ Rejected')
        handled = true
      } else if (['0', '1', '2', '3'].includes(answer)) {
        const newIndex = parseInt(answer, 10)
        await supabase.from('questions').update({ correct_index: newIndex, review_status: 'approved' }).eq('id', q.id)
        corrected++
        console.log(`  ✅ Corrected → ${['A', 'B', 'C', 'D'][newIndex]} and approved`)
        handled = true
      } else if (answer === 's' || answer === 'n') {
        skipped++
        console.log('  ⏭  Skipped')
        handled = true
      } else {
        console.log('  ⚠ Unknown command. Use a/r/0-3/s/q')
      }
    }
  }

  rl.close()
  console.log(`\n✅ Review complete: ${approved} approved  ${rejected} rejected  ${corrected} corrected  ${skipped} skipped`)
}

main().catch(err => { console.error('Unhandled:', err); process.exit(1) })
