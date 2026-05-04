/**
 * Lemon Squeezy webhook signature verification + event handlers.
 *
 * LS signs each webhook POST with HMAC-SHA256 of the raw body using the
 * webhook secret we configured in the LS dashboard. The signature lands in
 * the `X-Signature` header. We MUST verify before trusting any payload —
 * otherwise anyone could POST fake events to grant themselves Pro.
 */

import { createHmac, timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { mapLemonSqueezyStatus } from './index'

/**
 * Verify the X-Signature header matches HMAC-SHA256(rawBody, secret).
 * Constant-time comparison so we don't leak a timing oracle.
 */
export function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env['LEMONSQUEEZY_WEBHOOK_SECRET']
  if (!secret) {
    console.error('[LS webhook] LEMONSQUEEZY_WEBHOOK_SECRET not configured')
    return false
  }
  if (!signatureHeader) return false

  const computed = createHmac('sha256', secret).update(rawBody).digest('hex')
  const provided = signatureHeader.trim()

  // Both must be hex strings of the same length for timingSafeEqual.
  if (computed.length !== provided.length) return false
  try {
    return timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(provided, 'hex'))
  } catch {
    return false
  }
}

// ── Event types we handle ────────────────────────────────────────────────────
// Per https://docs.lemonsqueezy.com/help/webhooks#what-events-are-available
export type LSEvent =
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_cancelled'
  | 'subscription_resumed'
  | 'subscription_expired'
  | 'subscription_paused'
  | 'subscription_unpaused'
  | 'subscription_payment_failed'
  | 'subscription_payment_success'

interface LSSubscriptionPayload {
  meta?: {
    event_name?: LSEvent
    custom_data?: Record<string, string>
  }
  data?: {
    id?: string
    type?: string
    attributes?: {
      store_id?: number
      customer_id?: number
      order_id?: number
      variant_id?: number
      product_name?: string
      variant_name?: string
      user_email?: string
      status?: string
      pause?: { mode: 'void' | 'free' } | null
      cancelled?: boolean
      trial_ends_at?: string | null
      renews_at?: string | null
      ends_at?: string | null
      created_at?: string
      updated_at?: string
    }
  }
}

/**
 * Single entry point — upserts the subscriptions row from the LS payload.
 * Events that share the same payload shape (subscription_created, _updated,
 * _cancelled, _resumed, _payment_*) all funnel through here. The `status`
 * attribute on the subscription is the source of truth.
 */
export async function handleSubscriptionEvent(payload: LSSubscriptionPayload): Promise<{ ok: boolean; reason?: string }> {
  const event = payload.meta?.event_name
  const sub = payload.data?.attributes
  const lsSubscriptionId = payload.data?.id

  if (!event || !sub || !lsSubscriptionId) {
    return { ok: false, reason: 'malformed_payload' }
  }

  const userId = payload.meta?.custom_data?.user_id
  if (!userId) {
    logger.error({ event, lsSubscriptionId }, 'LS webhook: missing custom_data.user_id — cannot link subscription')
    return { ok: false, reason: 'missing_user_id' }
  }

  const supabase = createAdminClient()
  const status = mapLemonSqueezyStatus(sub.status ?? '')
  const now = new Date().toISOString()

  // Upsert by user_id (one subscription per user — matches existing schema's
  // unique constraint). On conflict we OVERWRITE — the latest webhook is truth.
  const updates: Record<string, unknown> = {
    user_id: userId,
    plan: 'pro',
    status,
    // LS-specific columns (added in migration 049)
    ls_subscription_id: lsSubscriptionId,
    ls_customer_id: sub.customer_id != null ? String(sub.customer_id) : null,
    ls_variant_id: sub.variant_id != null ? String(sub.variant_id) : null,
    ls_order_id: sub.order_id != null ? String(sub.order_id) : null,
    // Period / lifecycle
    trial_end: sub.trial_ends_at ?? null,
    current_period_end: sub.renews_at ?? sub.ends_at ?? null,
    cancel_at_period_end: Boolean(sub.cancelled),
    updated_at: now,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('subscriptions') as any)
    .upsert(updates, { onConflict: 'user_id' })

  if (error) {
    logger.error({ err: error, event, lsSubscriptionId, userId }, 'LS webhook: subscription upsert failed')
    return { ok: false, reason: 'upsert_failed' }
  }

  logger.info({ event, lsSubscriptionId, userId, status }, 'LS webhook: subscription synced')
  return { ok: true }
}
