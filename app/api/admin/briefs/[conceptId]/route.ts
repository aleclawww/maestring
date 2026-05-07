export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordAdminAction } from '@/lib/admin/rpc'
import { logger } from '@/lib/logger'
import { BriefBodySchema } from '../_schema'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { conceptId: string } },
) {
  const admin = await requireAdmin()

  if (!z.string().uuid().safeParse(params.conceptId).success) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  let parsed
  try {
    parsed = BriefBodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('concept_briefs')
    .update({
      title: parsed.title,
      body_md: parsed.bodyMd,
      gotchas: parsed.gotchas ?? null,
      related_concept_ids: parsed.relatedConceptIds ?? null,
      diagram_url: parsed.diagramUrl ?? null,
    })
    .eq('concept_id', params.conceptId)
    .select('concept_id')
    .maybeSingle()

  if (error) {
    logger.error(
      { err: error, conceptId: params.conceptId },
      'admin briefs: update failed',
    )
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'brief_not_found' }, { status: 404 })
  }

  await recordAdminAction({
    adminEmail: admin.email ?? 'unknown',
    action: 'update_concept_brief',
    details: { conceptId: params.conceptId, title: parsed.title },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { conceptId: string } },
) {
  const admin = await requireAdmin()

  if (!z.string().uuid().safeParse(params.conceptId).success) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('concept_briefs')
    .delete()
    .eq('concept_id', params.conceptId)

  if (error) {
    logger.error(
      { err: error, conceptId: params.conceptId },
      'admin briefs: delete failed',
    )
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
  }

  await recordAdminAction({
    adminEmail: admin.email ?? 'unknown',
    action: 'delete_concept_brief',
    details: { conceptId: params.conceptId },
  })

  return NextResponse.json({ ok: true })
}
