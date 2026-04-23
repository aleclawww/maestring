import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordAdminAction } from '@/lib/admin/rpc'
import { logger } from '@/lib/logger'

const Body = z.object({
  userId: z.string().uuid(),
  days: z.number().int().min(1).max(3650),
  reason: z.string().trim().min(1).max(500),
})

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 })
  }
  const { userId, days, reason } = parsed.data

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.rpc('admin_grant_pro' as any, {
    p_user_id: userId,
    p_days: days,
    p_reason: reason,
  })
  if (error) {
    logger.error({ err: error, userId, adminEmail: admin.email }, 'admin_grant_pro failed')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await recordAdminAction({
    adminEmail: admin.email!,
    action: 'grant_pro',
    targetUserId: userId,
    details: { days, reason },
  })

  return NextResponse.json({ ok: true })
}
