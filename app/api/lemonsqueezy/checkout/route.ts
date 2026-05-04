export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createCheckout } from '@/lib/lemonsqueezy'
import { logger } from '@/lib/logger'

/**
 * POST /api/lemonsqueezy/checkout
 *
 * Returns { url } pointing at the LS-hosted checkout for the Pro Monthly
 * variant. Card is collected upfront (LS default), 7-day trial begins
 * immediately, first $19 charge fires on day 8 unless cancelled.
 */
export async function POST() {
  const user = await requireAuthenticatedUser()

  const siteUrl = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://maestring.com'
  try {
    const { url } = await createCheckout({
      userId: user.id,
      email: user.email ?? null,
      successUrl: `${siteUrl}/dashboard?checkout=success`,
    })
    return NextResponse.json({ url })
  } catch (err) {
    logger.error({ err, userId: user.id }, 'LS checkout creation failed')
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: 'checkout_failed', message: msg },
      { status: 500 }
    )
  }
}
