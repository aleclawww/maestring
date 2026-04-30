export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordAdminAction } from '@/lib/admin/rpc'

const PatchSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  rejectReason: z.string().trim().max(500).nullable().optional(),
  edits: z
    .object({
      question_text: z.string().trim().min(20).max(2000).optional(),
      options: z.array(z.string().trim().min(1).max(500)).length(4).optional(),
      correct_index: z.number().int().min(0).max(3).optional(),
      explanation: z.string().trim().min(10).max(4000).optional(),
      difficulty: z.number().min(0).max(1).optional(),
    })
    .optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

  const update: Record<string, unknown> = {}
  if (parsed.edits) Object.assign(update, parsed.edits)
  if (parsed.status) {
    update['review_status'] = parsed.status
    update['reviewed_at'] = new Date().toISOString()
    update['reviewed_by'] = admin.id
    if (parsed.status === 'rejected') {
      update['is_active'] = false
      update['reject_reason'] = parsed.rejectReason ?? null
    } else if (parsed.status === 'approved') {
      update['is_active'] = true
      update['reject_reason'] = null
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('questions') as any).update(update).eq('id', params.id)
  if (error) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  await recordAdminAction({
    adminEmail: admin.email ?? 'unknown',
    action: 'review_question',
    details: { questionId: params.id, status: parsed.status, edited: Boolean(parsed.edits) },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()

  if (!z.string().uuid().safeParse(params.id).success) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { error } = await supabase.from('questions').delete().eq('id', params.id)
  if (error) {
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
  }

  await recordAdminAction({
    adminEmail: admin.email ?? 'unknown',
    action: 'delete_question',
    details: { questionId: params.id },
  })

  return NextResponse.json({ ok: true })
}
