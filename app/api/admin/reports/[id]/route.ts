export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordAdminAction } from '@/lib/admin/rpc'

// status transitions per Phase 1 spec / migration 050:
// pending → reviewed | dismissed | fixed
const PatchSchema = z.object({
  status: z.enum(['reviewed', 'dismissed', 'fixed']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const admin = await requireAdmin()

  if (!z.string().uuid().safeParse(params.id).success) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  let parsed
  try {
    parsed = PatchSchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('question_reports')
    .update({
      status: parsed.status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
    })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  await recordAdminAction({
    adminEmail: admin.email ?? 'unknown',
    action: 'review_question_report',
    details: { reportId: params.id, status: parsed.status },
  })

  return NextResponse.json({ ok: true })
}
