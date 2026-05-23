import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'

// Elaboration content seeder.
//
// Reads data/concept-elaborations.json and upserts into concept_elaborations.
// Resolves concept_slug → concept_id by querying the concepts table.
//
// Why a separate script (not folded into seed-canonical or seed-aws-saa):
// elaboration content is the kind of thing a non-engineer should be able to
// edit in a JSON file and re-run with one command, without dragging in the
// rest of the knowledge-graph seed. Mirrors the rationale for concept_briefs
// having its own admin UI.
//
// CLI:
//   tsx scripts/seed-elaborations.ts                  # upsert (default)
//   tsx scripts/seed-elaborations.ts --reset          # delete all + reinsert
//   tsx scripts/seed-elaborations.ts --dry-run        # validate only
//
// Zod validates every entry BEFORE touching the DB. A single malformed entry
// blocks the whole batch — better to fail loudly than half-write.

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? 'true']
  }),
)
const RESET = args['reset'] === 'true'
const DRY_RUN = args['dry-run'] === 'true'

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[seed-elaborations] missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

// Mirrors the CHECK constraints in migration 052. Validating here too catches
// the failure with a clean stack trace instead of a Postgres CHECK violation.
const ElaborationEntrySchema = z.object({
  concept_slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'slug must be kebab-case'),
  model_explanation_md: z.string().min(50).max(4000),
  key_points: z
    .array(z.string().trim().min(3).max(120))
    .min(2)
    .max(6),
  metacognitive_prompt: z
    .string()
    .trim()
    .min(10)
    .max(500)
    .optional()
    .nullable(),
})

const FileSchema = z.object({
  elaborations: z.array(ElaborationEntrySchema).min(1),
})

async function main() {
  const filePath = resolve(process.cwd(), 'data/concept-elaborations.json')
  const raw = readFileSync(filePath, 'utf-8')
  // Strip _README + $schema metadata — Zod's strict mode would reject them.
  const parsedJson = JSON.parse(raw) as Record<string, unknown>
  const fileData = FileSchema.parse({ elaborations: parsedJson['elaborations'] })

  console.log(`[seed-elaborations] loaded ${fileData.elaborations.length} entries from ${filePath}`)

  // Resolve concept_slug → concept_id in one round trip. The concepts table
  // is keyed by (certification_id, slug); we filter by aws-saa-c03 because
  // every concept in the seed targets that cert. If we ever support multi-
  // cert elaborations we'll need to accept certification_id per entry.
  const slugs = fileData.elaborations.map(e => e.concept_slug)
  const { data: concepts, error: conceptsErr } = await supabase
    .from('concepts')
    .select('id, slug')
    .eq('certification_id', 'aws-saa-c03')
    .in('slug', slugs)
  if (conceptsErr) {
    console.error('[seed-elaborations] failed to resolve concept slugs:', conceptsErr.message)
    process.exit(1)
  }

  const slugToId = new Map((concepts ?? []).map(c => [c.slug, c.id]))
  const unresolved = slugs.filter(s => !slugToId.has(s))
  if (unresolved.length > 0) {
    console.error('[seed-elaborations] these concept_slugs do not exist in concepts (aws-saa-c03):')
    unresolved.forEach(s => console.error(`  - ${s}`))
    console.error('  Run `npm run seed` first, or fix the slugs in data/concept-elaborations.json.')
    process.exit(1)
  }

  const rows = fileData.elaborations.map(e => ({
    concept_id: slugToId.get(e.concept_slug)!,
    model_explanation_md: e.model_explanation_md,
    key_points: e.key_points,
    metacognitive_prompt: e.metacognitive_prompt ?? null,
  }))

  if (DRY_RUN) {
    console.log(`[seed-elaborations] --dry-run: would write ${rows.length} rows. Exiting without DB write.`)
    rows.forEach((r, i) => {
      console.log(`  ${i + 1}. concept_id=${r.concept_id} key_points=${r.key_points.length} meta=${r.metacognitive_prompt ? 'yes' : 'no'}`)
    })
    return
  }

  if (RESET) {
    console.log('[seed-elaborations] --reset: deleting all rows in concept_elaborations')
    // `.neq('concept_id', ...uuid that doesn't exist)` is the canonical
    // Supabase pattern to "delete all" — Supabase REST requires a filter.
    const { error: delErr } = await supabase
      .from('concept_elaborations')
      .delete()
      .neq('concept_id', '00000000-0000-0000-0000-000000000000')
    if (delErr) {
      console.error('[seed-elaborations] delete failed:', delErr.message)
      process.exit(1)
    }
  }

  // Upsert by primary key (concept_id). Overwrites existing rows — matches
  // the "no versioning, destructive edits" philosophy from concept_briefs.
  // Cast bypasses the generated-types union (table is new in migration 052;
  // run `npm run db:types` after applying to remove the need).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: upsertErr, count } = await (supabase
    .from('concept_elaborations' as any) as any)
    .upsert(rows, { onConflict: 'concept_id', count: 'exact' })
  if (upsertErr) {
    console.error('[seed-elaborations] upsert failed:', upsertErr.message)
    process.exit(1)
  }

  console.log(`[seed-elaborations] ✅ wrote ${count ?? rows.length} elaboration row(s)`)
  console.log(`[seed-elaborations]    concepts covered: ${slugs.join(', ')}`)
}

main().catch(err => {
  console.error('[seed-elaborations] unexpected error:', err)
  process.exit(1)
})
