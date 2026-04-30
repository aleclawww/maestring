import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const user = await requireAuthenticatedUser()
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc('get_exam_readiness_v2' as any, {
    p_user_id: user.id,
  })

  if (error) {
    logger.error({ err: error, userId: user.id }, 'get_exam_readiness_v2 failed')
    return NextResponse.json({ error: 'Failed to compute readiness' }, { status: 500 })
  }

  return NextResponse.json({ data: Array.isArray(data) ? data[0] ?? null : data })
}
