import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateQuestion } from '@/lib/question-engine/generator'
import { recordAdminAction } from '@/lib/admin/rpc'
import { logger } from '@/lib/logger'
import { captureApiException } from '@/lib/sentry/capture'

export const maxDuration = 120

const BodySchema = z.object({
  conceptId: z.string().uuid(),
  count: z.number().int().min(1).max(20),
})

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()

  let parsed
  try {
    parsed = BodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: concept } = await supabase
    .from('concepts')
    .select('id, slug, name')
    .eq('id', parsed.conceptId)
    .maybeSingle()

  if (!concept?.slug) {
    return NextResponse.json({ error: 'concept_not_found' }, { status: 404 })
  }

  let generated = 0
  let failed = 0
  for (let i = 0; i < parsed.count; i++) {
    try {
      await generateQuestion({
        conceptSlug: concept.slug,
        conceptId: concept.id,
        mode: 'review',
        reviewStatus: 'pending',
      })
      generated++
    } catch (err) {
      failed++
      captureApiException(err, {
        route: '/api/admin/questions/generate-batch',
        extra: { conceptId: concept.id, iteration: i },
      })
      logger.warn({ err, conceptId: concept.id }, 'Admin batch generation: one question failed')
    }
  }

  await recordAdminAction({
    adminEmail: admin.email ?? 'unknown',
    action: 'generate_question_batch',
    details: { conceptId: concept.id, conceptName: concept.name, requested: parsed.count, generated, failed },
  })

  return NextResponse.json({ generated, failed, requested: parsed.count })
}
