export const runtime = 'nodejs'

import { NextResponse } from 'next/server'

/**
 * Billing migrated to Lemon Squeezy. The replacement portal lives at
 * /api/lemonsqueezy/portal — it resolves the per-customer self-service URL
 * (urls.customer_portal) from the LS subscription.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'gone',
      message: 'Billing has moved to Lemon Squeezy. Use /api/lemonsqueezy/portal.',
    },
    { status: 410 }
  )
}
