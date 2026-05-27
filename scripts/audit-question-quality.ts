import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

/**
 * Heuristic audit of question/answer text quality.
 *
 * Read-only. Pulls every row from `questions` and writes a CSV sorted by
 * severity. Flags structural problems (not phrased as a question, options
 * that are single terms, etc.). Does NOT judge factual correctness — that's
 * what qa-crosscheck-groq.ts / Sonnet validation is for.
 *
 * CLI:
 *   tsx scripts/audit-question-quality.ts
 *   tsx scripts/audit-question-quality.ts --out=./audit-2026-05-27.csv
 *   tsx scripts/audit-question-quality.ts --min-severity=2
 */

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? 'true']
  }),
)

const OUT = args['out'] ?? `./audit-questions-${new Date().toISOString().slice(0, 10)}.csv`
const MIN_SEVERITY = args['min-severity'] ? parseInt(args['min-severity'], 10) : 0

const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
const key = process.env['SUPABASE_SERVICE_ROLE_KEY']
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supa = createClient(url, key, { auth: { persistSession: false } })

const INTERROGATIVES = /\b(which|what|how|why|when|where|who|whose|whom|does|do|is|are|can|should|would|will)\b/i
const IMPERATIVE = /\b(select|choose|pick|identify|determine)\b/i
// AWS-exam scenario style: "The team must…", "minimize cost", "with the LEAST overhead"
const SCENARIO_CUE = /\b(must|should|needs? to|requires?|wants? to|LEAST|MOST|minimize|maximize|ensure|without)\b/

type Flag = { code: string; severity: 1 | 2 | 3; note?: string }

function audit(q: any): Flag[] {
  const flags: Flag[] = []
  const text: string = (q.question_text ?? '').trim()
  const opts: string[] = Array.isArray(q.options) ? q.options : []

  // --- question_text ---
  if (!text) {
    flags.push({ code: 'empty_text', severity: 3 })
  } else {
    const words = text.split(/\s+/).filter(Boolean).length
    const isLongScenario = text.length >= 120 || words >= 20
    const hasInterrogative = INTERROGATIVES.test(text)
    const hasImperative = IMPERATIVE.test(text)
    const hasScenarioCue = SCENARIO_CUE.test(text)

    if (text.length < 40) {
      flags.push({ code: 'text_too_short', severity: 3, note: `${text.length} chars` })
    }
    if (words < 6) {
      flags.push({ code: 'fewer_than_6_words', severity: 3, note: `${words} words` })
    }
    // Only flag "not a question" on SHORT texts. Long scenarios in AWS exams
    // routinely end in a declarative requirement, not a "?".
    if (!isLongScenario && !text.endsWith('?') && !hasImperative) {
      flags.push({ code: 'short_text_no_question_mark', severity: 2 })
    }
    // Truly suspicious: short text with NO question structure at all.
    if (!isLongScenario && !hasInterrogative && !hasImperative && !hasScenarioCue) {
      flags.push({ code: 'no_question_structure', severity: 3 })
    }
    // Concept-title smell: very short and starts with capitalized noun phrase
    // like "VPC Endpoints (Gateway and Interface)" — looks like a heading.
    if (text.length < 80 && /^[A-Z][^.!?]*$/.test(text) && !text.endsWith('?')) {
      flags.push({ code: 'looks_like_concept_title', severity: 3 })
    }
  }

  // --- options ---
  if (opts.length !== 4) {
    flags.push({ code: 'option_count_not_4', severity: 3, note: `${opts.length} options` })
  }
  const lens = opts.map(o => (o ?? '').trim().length)
  const wordCounts = opts.map(o => (o ?? '').trim().split(/\s+/).filter(Boolean).length)
  const allSingleTerm = opts.length > 0 && wordCounts.every(w => w <= 2)
  const avgWords = wordCounts.length ? wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length : 0

  if (allSingleTerm) {
    flags.push({ code: 'all_options_are_terms', severity: 3, note: `avg ${avgWords.toFixed(1)} words` })
  } else if (avgWords < 3) {
    flags.push({ code: 'options_avg_under_3_words', severity: 2, note: `avg ${avgWords.toFixed(1)} words` })
  }

  opts.forEach((o, i) => {
    const v = (o ?? '').trim()
    if (!v) flags.push({ code: `option_${i}_empty`, severity: 3 })
    else if (v.length <= 4 && /^[A-Z0-9]+$/.test(v)) {
      // looks like a bare acronym: "S3", "EBS", "VPC"
      flags.push({ code: `option_${i}_bare_acronym`, severity: 2, note: v })
    }
  })

  // duplicates
  const lower = opts.map(o => (o ?? '').trim().toLowerCase())
  const dupes = lower.filter((v, i) => v && lower.indexOf(v) !== i)
  if (dupes.length) flags.push({ code: 'duplicate_options', severity: 3, note: dupes.join('|') })

  // correct_index out of range
  if (typeof q.correct_index !== 'number' || q.correct_index < 0 || q.correct_index >= opts.length) {
    flags.push({ code: 'correct_index_invalid', severity: 3, note: String(q.correct_index) })
  }

  // explanation missing
  if (!q.explanation || String(q.explanation).trim().length < 20) {
    flags.push({ code: 'explanation_missing_or_short', severity: 1 })
  }

  return flags
}

function csvEscape(v: any): string {
  if (v === null || v === undefined) return ''
  const s = String(v).replace(/\r?\n/g, ' ').replace(/"/g, '""')
  return `"${s}"`
}

async function main() {
  console.log('Fetching questions…')
  // paginate to handle thousands of rows
  const pageSize = 1000
  let from = 0
  const rows: any[] = []
  while (true) {
    const { data, error } = await supa
      .from('questions')
      .select('id, concept_id, question_text, options, correct_index, explanation, source, review_status, is_active, difficulty')
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw error
    if (!data?.length) break
    rows.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  console.log(`Loaded ${rows.length} questions`)

  // concept names for context
  const conceptIds = [...new Set(rows.map(r => r.concept_id).filter(Boolean))]
  const { data: concepts } = await supa.from('concepts').select('id, slug, name').in('id', conceptIds)
  const conceptMap = new Map((concepts ?? []).map(c => [c.id, c]))

  const auditRows = rows
    .map(q => {
      const flags = audit(q)
      const severity = flags.reduce((m, f) => Math.max(m, f.severity), 0)
      return { q, flags, severity }
    })
    .filter(r => r.severity >= MIN_SEVERITY)
    .sort((a, b) => b.severity - a.severity || b.flags.length - a.flags.length)

  // summary
  const total = rows.length
  const flagged = auditRows.filter(r => r.flags.length > 0).length
  const bySeverity = { 3: 0, 2: 0, 1: 0 }
  for (const r of auditRows) if (r.severity) bySeverity[r.severity as 1 | 2 | 3]++
  const flagCounts: Record<string, number> = {}
  for (const r of auditRows) for (const f of r.flags) flagCounts[f.code] = (flagCounts[f.code] ?? 0) + 1

  console.log('\n=== SUMMARY ===')
  console.log(`Total questions:      ${total}`)
  console.log(`Flagged (any):        ${flagged}  (${((flagged / total) * 100).toFixed(1)}%)`)
  console.log(`Severity 3 (block):   ${bySeverity[3]}`)
  console.log(`Severity 2 (review):  ${bySeverity[2]}`)
  console.log(`Severity 1 (nit):     ${bySeverity[1]}`)
  console.log('\nTop flag codes:')
  Object.entries(flagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([code, n]) => console.log(`  ${n.toString().padStart(5)}  ${code}`))

  // CSV
  const header = [
    'severity', 'flag_count', 'flags', 'id', 'review_status', 'source', 'is_active',
    'concept_slug', 'concept_name', 'question_text',
    'option_0', 'option_1', 'option_2', 'option_3',
    'correct_index', 'correct_option', 'explanation',
  ].join(',')

  const lines = [header]
  for (const { q, flags, severity } of auditRows) {
    const c = conceptMap.get(q.concept_id)
    const opts: string[] = Array.isArray(q.options) ? q.options : []
    lines.push([
      severity,
      flags.length,
      csvEscape(flags.map(f => f.code + (f.note ? `(${f.note})` : '')).join('; ')),
      csvEscape(q.id),
      csvEscape(q.review_status),
      csvEscape(q.source),
      q.is_active,
      csvEscape(c?.slug ?? ''),
      csvEscape(c?.name ?? ''),
      csvEscape(q.question_text),
      csvEscape(opts[0]),
      csvEscape(opts[1]),
      csvEscape(opts[2]),
      csvEscape(opts[3]),
      q.correct_index,
      csvEscape(opts[q.correct_index]),
      csvEscape(q.explanation),
    ].join(','))
  }

  const outAbs = path.resolve(OUT)
  fs.writeFileSync(outAbs, lines.join('\n'), 'utf8')
  console.log(`\nWrote ${auditRows.length} rows → ${outAbs}`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
