export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireAuthenticatedUser()

  if (!z.string().uuid().safeParse(params.id).success) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('concept_briefs')
    .select(
      'concept_id, title, body_md, gotchas, related_concept_ids, diagram_url, updated_at',
    )
    .eq('concept_id', params.id)
    .maybeSingle()

  if (error) {
    logger.error(
      { err: error, userId: user.id, conceptId: params.id },
      'concept_briefs read failed',
    )
    return NextResponse.json({ error: 'brief_read_failed' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'brief_not_found' }, { status: 404 })
  }

  return NextResponse.json({
    conceptId: data.concept_id,
    title: data.title,
    bodyMd: data.body_md,
    gotchas: data.gotchas,
    relatedConceptIds: data.related_concept_ids,
    diagramUrl: data.diagram_url,
    updatedAt: data.updated_at,
  })
}
