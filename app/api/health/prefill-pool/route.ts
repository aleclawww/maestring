export const runtime = 'nodejs'
export const maxDuration = 300 // up to 5 min for the bulk insert

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONCEPTS } from "@/lib/knowledge-graph/aws-saa";
import { generateQuestionStatic } from "@/lib/question-engine/static-generator";
import { logger } from "@/lib/logger";

/**
 * Pre-fill the question pool entirely from the static generator. Zero LLM,
 * zero external API. For each concept produces up to QUESTIONS_PER_CONCEPT
 * unique questions (rotating through the 5 generator types and seed offsets).
 *
 * Idempotent: ON CONFLICT (question_text) DO NOTHING via dedup-by-text in
 * application layer (Supabase doesn't have a unique constraint on text, so
 * we read existing question_text per concept and skip duplicates).
 */
const QUESTIONS_PER_CONCEPT = 15;

export async function POST(_req: NextRequest) {
  void _req;
  const supabase = createAdminClient();

  // 1. Map slug → concept_id from DB. The local CONCEPTS array uses slugs;
  //    the DB stores numeric/uuid ids on the concepts table.
  const { data: conceptRows, error: cErr } = await supabase
    .from('concepts')
    .select('id, slug')
    .eq('is_active', true);
  if (cErr || !conceptRows) {
    logger.error({ err: cErr }, 'prefill: load concepts failed');
    return NextResponse.json({ error: 'load_concepts_failed', detail: cErr?.message }, { status: 500 });
  }
  const idBySlug = new Map(conceptRows.map(r => [r.slug, r.id]));

  // 2. For each concept, fetch existing question texts so we can dedup.
  //    One round-trip per concept; cheap enough at 142 concepts.
  let totalGenerated = 0;
  let totalInserted = 0;
  let totalSkipped = 0;
  const errors: Array<{ slug: string; reason: string }> = [];

  // Generate-and-insert in batches per concept.
  for (const concept of CONCEPTS) {
    const conceptId = idBySlug.get(concept.slug);
    if (!conceptId) {
      errors.push({ slug: concept.slug, reason: 'concept_not_in_db' });
      continue;
    }

    // Existing question texts for dedup.
    const { data: existing } = await supabase
      .from('questions')
      .select('question_text')
      .eq('concept_id', conceptId);
    const existingTexts = new Set((existing ?? []).map(e => e.question_text));

    // Generate up to QUESTIONS_PER_CONCEPT unique ones, with retries on dup.
    const fresh: Array<ReturnType<typeof generateQuestionStatic>> = [];
    const seenTexts = new Set<string>();
    const MAX_TRIES = QUESTIONS_PER_CONCEPT * 4;
    for (let t = 0; t < MAX_TRIES && fresh.length < QUESTIONS_PER_CONCEPT; t++) {
      // Use varied seeds across the full int range so generator type and
      // position both rotate properly.
      const seed = ((t + 1) * 2654435761 + (Math.random() * 0x7fffffff | 0)) >>> 0;
      const q = generateQuestionStatic(concept, seed);
      if (existingTexts.has(q.questionText) || seenTexts.has(q.questionText)) continue;
      seenTexts.add(q.questionText);
      fresh.push(q);
    }
    totalGenerated += fresh.length;

    if (fresh.length === 0) continue;

    const rows = fresh.map(q => ({
      concept_id: conceptId,
      question_text: q.questionText,
      options: q.options,
      correct_index: q.correctIndex,
      explanation: q.explanation,
      difficulty: q.difficulty,
      question_type: 'multiple_choice',
      source: 'static',
      review_status: 'approved',
      pattern_tag: q.patternTag ?? null,
      is_canonical: false,
      is_active: true,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insErr, count } = await (supabase.from('questions') as any)
      .insert(rows, { count: 'exact' });
    if (insErr) {
      // 23505 = unique violation — partial dup, skip the conflicting ones
      logger.warn({ err: insErr, slug: concept.slug }, 'prefill: insert error (partial dups likely)');
      errors.push({ slug: concept.slug, reason: insErr.message });
      totalSkipped += rows.length;
      continue;
    }
    totalInserted += count ?? rows.length;
  }

  logger.info(
    { concepts: CONCEPTS.length, totalGenerated, totalInserted, totalSkipped, errors: errors.length },
    'prefill-pool complete'
  );
  return NextResponse.json({
    ok: true,
    concepts: CONCEPTS.length,
    totalGenerated,
    totalInserted,
    totalSkipped,
    errorSlugs: errors.slice(0, 10),
  });
}
