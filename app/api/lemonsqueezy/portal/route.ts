export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCustomerPortalUrl } from '@/lib/lemonsqueezy'
import { logger } from '@/lib/logger'

/**
 * POST /api/lemonsqueezy/portal
 *
 * Returns { url } for the LS-hosted self-service portal where the user can
 * update their card, change plan, or cancel. Per-customer URL — we fetch it
 * from the subscription resource because LS embeds it in
 * `attributes.urls.customer_portal`.
 */
export async function POST() {
  const user = await requireAuthenticatedUser()
  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (supabase
    .from('subscriptions')
    .select('ls_subscription_id' as any) as any)
    .eq('user_id', user.id)
    .maybeSingle()

  const lsSubId = (row?.ls_subscription_id ?? null) as string | null
  if (!lsSubId) {
    return NextResponse.json(
      { error: 'no_subscription', message: 'No Lemon Squeezy subscription found for this user.' },
      { status: 404 }
    )
  }

  const url = await getCustomerPortalUrl(lsSubId)
  if (!url) {
    logger.error({ userId: user.id, lsSubId }, 'LS portal URL fetch failed')
    return NextResponse.json({ error: 'portal_unavailable' }, { status: 502 })
  }
  return NextResponse.json({ url })
}
