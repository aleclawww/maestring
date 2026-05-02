export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CERTIFICATION_ID, DOMAINS, TOPICS, CONCEPTS } from "@/lib/knowledge-graph/aws-saa";
import { logger } from "@/lib/logger";

// One-shot. Idempotent (upserts). Will be removed after the prod DB
// catches up to the extended knowledge graph.
export async function POST(_req: NextRequest) {
  void _req;
  const supabase = createAdminClient();

  // 1) Domains
  const domainRows = DOMAINS.map((d, i) => ({
    certification_id: CERTIFICATION_ID,
    slug: d.slug,
    name: d.name,
    description: d.description,
    exam_weight_percent: d.examWeightPercent,
    color: d.color,
    sort_order: i,
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: domains, error: domErr } = await (supabase.from('knowledge_domains') as any)
    .upsert(domainRows, { onConflict: 'certification_id,slug' })
    .select('id, slug');
  if (domErr) {
    logger.error({ err: domErr }, 'reseed: domains failed');
    return NextResponse.json({ stage: 'domains', error: domErr.message }, { status: 500 });
  }
  const domainIdBySlug = new Map((domains as Array<{ id: string; slug: string }>).map(d => [d.slug, d.id]));

  // 2) Topics
  const topicRows = TOPICS.map((t, i) => {
    const domainId = domainIdBySlug.get(t.domainSlug);
    if (!domainId) throw new Error(`Topic ${t.slug} references unknown domain ${t.domainSlug}`);
    return { domain_id: domainId, slug: t.slug, name: t.name, sort_order: i };
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: topics, error: topErr } = await (supabase.from('domain_topics') as any)
    .upsert(topicRows, { onConflict: 'domain_id,slug' })
    .select('id, slug');
  if (topErr) {
    logger.error({ err: topErr }, 'reseed: topics failed');
    return NextResponse.json({ stage: 'topics', error: topErr.message }, { status: 500 });
  }
  const topicIdBySlug = new Map((topics as Array<{ id: string; slug: string }>).map(t => [t.slug, t.id]));

  // 3) Concepts (batched)
  const conceptRows = CONCEPTS.map(c => {
    const domainId = domainIdBySlug.get(c.domainSlug);
    if (!domainId) throw new Error(`Concept ${c.slug} references unknown domain ${c.domainSlug}`);
    return {
      certification_id: CERTIFICATION_ID,
      domain_id: domainId,
      topic_id: topicIdBySlug.get(c.topicSlug) ?? null,
      slug: c.slug,
      name: c.name,
      description: c.description,
      difficulty: c.difficulty,
      key_facts: c.keyFacts,
      exam_tips: c.examTips,
      aws_services: c.awsServices,
      confused_with: c.confusedWith,
      is_active: true,
    };
  });

  const BATCH = 50;
  let total = 0;
  for (let i = 0; i < conceptRows.length; i += BATCH) {
    const batch = conceptRows.slice(i, i + BATCH);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('concepts') as any)
      .upsert(batch, { onConflict: 'certification_id,slug' });
    if (error) {
      logger.error({ err: error, batchStart: i }, 'reseed: concepts batch failed');
      return NextResponse.json(
        { stage: 'concepts', error: error.message, totalSoFar: total },
        { status: 500 }
      );
    }
    total += batch.length;
  }

  logger.info({ domains: DOMAINS.length, topics: TOPICS.length, concepts: total }, 'reseed complete');
  return NextResponse.json({
    ok: true,
    domains: DOMAINS.length,
    topics: TOPICS.length,
    concepts: total,
  });
}
