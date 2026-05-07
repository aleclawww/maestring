export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordAdminAction } from '@/lib/admin/rpc'
import { logger } from '@/lib/logger'
import { BriefBodySchema } from './_schema'

const CreateSchema = BriefBodySchema.extend({
  conceptId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()

  let parsed
  try {
    parsed = CreateSchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('concept_briefs')
    .insert({
      concept_id: parsed.conceptId,
      title: parsed.title,
      body_md: parsed.bodyMd,
      gotchas: parsed.gotchas ?? null,
      related_concept_ids: parsed.relatedConceptIds ?? null,
      diagram_url: parsed.diagramUrl ?? null,
    })

  if (error) {
    // 23505 = unique violation (the PK is concept_id, so this means a brief
    // already exists for that concept). Return 409 so the client can show a
    // useful message instead of a generic 500.
    const code = (error as { code?: string }).code
    if (code === '23505') {
      return NextResponse.json({ error: 'brief_already_exists' }, { status: 409 })
    }
    logger.error(
      { err: error, conceptId: parsed.conceptId },
      'admin briefs: insert failed',
    )
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  await recordAdminAction({
    adminEmail: admin.email ?? 'unknown',
    action: 'create_concept_brief',
    details: { conceptId: parsed.conceptId, title: parsed.title },
  })

  return NextResponse.json({ ok: true })
}
