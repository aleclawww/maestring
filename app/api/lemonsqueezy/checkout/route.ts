export const runtime = 'nodejs'

import { NextResponse, type NextRequest } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createCheckout } from '@/lib/lemonsqueezy'
import { logger } from '@/lib/logger'

/**
 * POST /api/lemonsqueezy/checkout
 *
 * Returns { url } pointing at the LS-hosted checkout for the Pro Monthly
 * variant. Card is collected upfront (LS default), 7-day trial begins
 * immediately, first $29 charge fires on day 8 unless cancelled.
 *
 * Defensive guard 2026-05-24: this endpoint creates ONLY Pro Monthly
 * checkouts. If a caller passes an explicit `plan` (in JSON body or
 * query string), we reject 400 for anything other than 'monthly'. The
 * Lifetime tier was cut from the marketing surface in the same change
 * because the checkout chain for it was never wired — but a stale
 * Google SERP, a third-party blog post, or a cached browser bookmark
 * could still surface `/signup?plan=lifetime` and shepherd a user
 * toward an endpoint that previously would have silently downgraded
 * them to Pro Monthly (paying $29/mo recurring for a product they
 * thought was $119 one-time). Closing the door at the endpoint, not
 * just at the UI, is defense in depth on money — the most expensive
 * place to be sloppy.
 */
export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser()

  // Read plan from BOTH body (JSON) and query string. Either can be the
  // entry point if a stale link or third-party form pokes us.
  let requestedPlan: string | undefined
  const queryPlan = req.nextUrl.searchParams.get('plan')
  if (queryPlan) requestedPlan = queryPlan
  if (!requestedPlan) {
    try {
      const ct = req.headers.get('content-type') ?? ''
      if (ct.includes('application/json')) {
        const body = (await req.json().catch(() => null)) as
          | { plan?: unknown }
          | null
        if (body && typeof body.plan === 'string') requestedPlan = body.plan
      }
    } catch {
      // Body parse failures are non-fatal — absence of plan is treated
      // as implicit 'monthly' (back-compat with callers that send no body).
    }
  }
  if (requestedPlan !== undefined && requestedPlan !== 'monthly') {
    logger.warn(
      { userId: user.id, requestedPlan },
      'checkout: rejected unsupported plan — defensive guard against Lifetime mis-charge'
    )
    return NextResponse.json(
      {
        error: 'unsupported_plan',
        message:
          'Only the Pro Monthly plan is available today. If you reached this URL via an old link, please use the current pricing page.',
      },
      { status: 400 }
    )
  }

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
