export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyLemonSqueezyWebhook, mapLSStatus, type LSStatus } from '@/lib/lemonsqueezy/client'
import { logger } from '@/lib/logger'

interface LSWebhookPayload {
  meta: {
    event_name: string
    custom_data?: { user_id?: string }
  }
  data: {
    id: string
    type: string
    attributes: {
      store_id: number
      customer_id: number
      product_id: number
      variant_id: number
      product_name: string
      status: LSStatus
      cancelled: boolean
      trial_ends_at: string | null
      renews_at: string | null
      ends_at: string | null
      created_at: string
      updated_at: string
    }
  }
}

export async function POST(req: NextRequest) {
  // 1) Verify HMAC. Use raw text body — JSON re-serialisation would change
  // whitespace and break signature match.
  const rawBody = await req.text()
  const sig = req.headers.get('x-signature')
  const valid = await verifyLemonSqueezyWebhook(rawBody, sig)
  if (!valid) {
    logger.warn({ sig }, 'lemonsqueezy webhook: bad signature')
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  let payload: LSWebhookPayload
  try {
    payload = JSON.parse(rawBody) as LSWebhookPayload
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const event = payload.meta.event_name
  const userId = payload.meta.custom_data?.user_id
  if (!userId) {
    logger.warn({ event }, 'lemonsqueezy webhook: no user_id in custom_data — orphan event')
    // Acknowledge so LS doesn't retry. The orphan is logged for investigation.
    return NextResponse.json({ ok: true, orphan: true })
  }

  const attrs = payload.data.attributes
  const mapped = mapLSStatus(attrs.status, attrs.cancelled)

  // Compute period boundaries from LS-provided dates. trialing → trial_ends_at,
  // active → renews_at, cancelled-but-still-on → ends_at.
  const trialEnd = attrs.trial_ends_at
  const periodEnd = attrs.renews_at ?? attrs.ends_at ?? null

  const supabase = createAdminClient()

  // Upsert subscriptions row by user_id. Reuses the table that the legacy
  // Stripe code populated — Stripe is no longer the source so it's safe to
  // overwrite freely.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: any = {
    user_id: userId,
    plan: 'pro',
    status: mapped.status,
    stripe_customer_id: String(attrs.customer_id),       // reused column name
    stripe_subscription_id: payload.data.id,             // reused column name
    stripe_price_id: String(attrs.variant_id),           // reused column name
    current_period_start: attrs.created_at,
    current_period_end: periodEnd,
    trial_end: trialEnd,
    cancel_at_period_end: mapped.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('subscriptions') as any)
    .upsert(row, { onConflict: 'user_id' })

  if (error) {
    logger.error({ err: error, event, userId }, 'lemonsqueezy webhook: subscription upsert failed')
    // Return 500 so LS retries (it does up to 3 times by default).
    return NextResponse.json({ error: 'db_write_failed' }, { status: 500 })
  }

  logger.info(
    { event, userId, lsStatus: attrs.status, internal: mapped.status, cancelled: attrs.cancelled },
    'lemonsqueezy webhook processed',
  )
  return NextResponse.json({ ok: true })
}
