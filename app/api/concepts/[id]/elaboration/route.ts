export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

// GET /api/concepts/[id]/elaboration
//
// Returns the pre-written elaboration content for a concept, used by the
// post-correct ElaborationPanel in the study flow. The content stays
// hidden in the UI until the user submits their own attempt — this endpoint
// is called when they OPT IN to "Explain it in your own words", so by the
// time the response reaches the client the user has already committed.
//
// 404 when no elaboration exists for the concept. The client should treat
// 404 as "no elaboration available for this concept, do not offer the CTA"
// — keeps zero noise for concepts that haven't been authored yet.
//
// Mirrors the /api/concepts/[id]/brief route pattern.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireAuthenticatedUser()

  if (!z.string().uuid().safeParse(params.id).success) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Cast bypasses the generated-types union — `concept_elaborations`
  // is new in migration 052 and types/supabase-generated.ts won't
  // include it until `npm run db:types` is re-run post-migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from('concept_elaborations' as any) as any)
    .select('concept_id, model_explanation_md, key_points, metacognitive_prompt, updated_at')
    .eq('concept_id', params.id)
    .maybeSingle()

  if (error) {
    logger.error(
      { err: error, userId: user.id, conceptId: params.id },
      'concept_elaborations read failed',
    )
    return NextResponse.json({ error: 'elaboration_read_failed' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'elaboration_not_found' }, { status: 404 })
  }

  return NextResponse.json({
    conceptId: data.concept_id,
    modelExplanationMd: data.model_explanation_md,
    keyPoints: data.key_points,
    metacognitivePrompt: data.metacognitive_prompt,
    updatedAt: data.updated_at,
  })
}
