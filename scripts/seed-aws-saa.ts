import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { CERTIFICATION_ID, DOMAINS, TOPICS, CONCEPTS } from '../lib/knowledge-graph/aws-saa'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function seed() {
  console.log(`\n🌱 Seeding ${CERTIFICATION_ID} knowledge graph...\n`)

  // 1) Domains — certification_id is a TEXT identifier (no certifications table)
  const domainRows = DOMAINS.map((d, i) => ({
    certification_id: CERTIFICATION_ID,
    slug: d.slug,
    name: d.name,
    description: d.description,
    exam_weight_percent: d.examWeightPercent,
    color: d.color,
    sort_order: i,
  }))
  const { data: domains, error: domErr } = await supabase
    .from('knowledge_domains')
    .upsert(domainRows, { onConflict: 'certification_id,slug' })
    .select('id, slug')
  if (domErr || !domains) {
    console.error('❌ Domains upsert failed:', domErr?.message)
    process.exit(1)
  }
  const domainIdBySlug = new Map(domains.map(d => [d.slug, d.id]))
  console.log(`✓ Domains: ${domains.length}`)

  // 2) Topics — table is `domain_topics`
  const topicRows = TOPICS.map((t, i) => {
    const domainId = domainIdBySlug.get(t.domainSlug)
    if (!domainId) throw new Error(`Topic ${t.slug} references unknown domain ${t.domainSlug}`)
    return {
      domain_id: domainId,
      slug: t.slug,
      name: t.name,
      sort_order: i,
    }
  })
  const { data: topics, error: topErr } = await supabase
    .from('domain_topics')
    .upsert(topicRows, { onConflict: 'domain_id,slug' })
    .select('id, slug')
  if (topErr || !topics) {
    console.error('❌ Topics upsert failed:', topErr?.message)
    process.exit(1)
  }
  const topicIdBySlug = new Map(topics.map(t => [t.slug, t.id]))
  console.log(`✓ Topics: ${topics.length}`)

  // 3) Concepts (batched). JSONB columns accept arrays as-is.
  const conceptRows = CONCEPTS.map(c => {
    const domainId = domainIdBySlug.get(c.domainSlug)
    if (!domainId) throw new Error(`Concept ${c.slug} references unknown domain ${c.domainSlug}`)
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
    }
  })

  const BATCH = 50
  let total = 0
  for (let i = 0; i < conceptRows.length; i += BATCH) {
    const batch = conceptRows.slice(i, i + BATCH)
    const { error } = await supabase
      .from('concepts')
      .upsert(batch, { onConflict: 'certification_id,slug' })
    if (error) {
      console.error(`❌ Concept batch ${i}-${i + BATCH} failed:`, error.message)
      process.exit(1)
    }
    total += batch.length
  }
  console.log(`✓ Concepts: ${total}`)

  console.log('\n✅ Knowledge graph seeded successfully.\n')
}

seed().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
