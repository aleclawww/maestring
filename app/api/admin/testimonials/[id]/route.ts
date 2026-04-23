import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordAdminAction } from '@/lib/admin/rpc'

const Body = z.object({
  status: z.enum(['approved', 'rejected', 'pending']).optional(),
  featured: z.boolean().optional(),
  rejectReason: z.string().trim().max(500).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  const parsed = Body.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const patch: Record<string, unknown> = {}
  if (parsed.data.status) {
    patch['status'] = parsed.data.status
    patch['reviewed_at'] = new Date().toISOString()
    patch['reviewed_by'] = admin.id
  }
  if (typeof parsed.data.featured === 'boolean') patch['featured'] = parsed.data.featured
  if (parsed.data.rejectReason) patch['reject_reason'] = parsed.data.rejectReason

  const { error } = await supabase.from('testimonials').update(patch).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAdminAction({
    adminEmail: admin.email!,
    action: 'testimonial_update',
    targetUserId: null,
    details: { testimonialId: params.id, ...parsed.data },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase.from('testimonials').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recordAdminAction({
    adminEmail: admin.email!,
    action: 'testimonial_delete',
    targetUserId: null,
    details: { testimonialId: params.id },
  })
  return NextResponse.json({ ok: true })
}
