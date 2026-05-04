export const runtime = 'nodejs'

import { NextResponse } from 'next/server'

/**
 * Billing migrated to Lemon Squeezy (May 2026). This Stripe endpoint is
 * intentionally disabled. The replacement is /api/lemonsqueezy/checkout,
 * which the UpgradeButton already calls. Any old client cache hitting this
 * URL gets a clean 410 with a hint instead of a misleading 5xx.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'gone',
      message: 'Billing has moved to Lemon Squeezy. Use /api/lemonsqueezy/checkout.',
    },
    { status: 410 }
  )
}
