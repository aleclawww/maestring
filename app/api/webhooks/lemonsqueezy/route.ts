export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { verifySignature, handleSubscriptionEvent } from '@/lib/lemonsqueezy/webhooks'
import { logger } from '@/lib/logger'

/**
 * POST /api/webhooks/lemonsqueezy
 *
 * Lemon Squeezy fires this for every subscription lifecycle event we
 * subscribed to (created/updated/cancelled/resumed/payment_failed/etc).
 *
 * MUST verify HMAC signature before trusting any payload — otherwise
 * anyone could POST a fake `subscription_created` event with their own
 * user_id and grant themselves Pro for free.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-signature')

  if (!verifySignature(rawBody, signature)) {
    logger.warn({ hasSig: Boolean(signature) }, 'LS webhook: invalid signature — rejecting')
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const event = (payload as any)?.meta?.event_name as string | undefined

  // Only subscription_* events feed the entitlement gate. Other events
  // (order_created, license_key_*, etc.) are acknowledged with 200 but
  // not processed — we don't want LS to keep retrying them.
  if (!event || !event.startsWith('subscription_')) {
    return NextResponse.json({ ok: true, ignored: event ?? 'unknown' })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await handleSubscriptionEvent(payload as any)
  if (!result.ok) {
    logger.error({ event, reason: result.reason }, 'LS webhook: handler failed')
    return NextResponse.json({ error: result.reason ?? 'handler_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, event })
}
