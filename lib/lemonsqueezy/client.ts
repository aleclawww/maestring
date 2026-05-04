/**
 * Minimal Lemon Squeezy API client.
 *
 * LS uses the JSON:API spec (data.{type,id,attributes,relationships}). We
 * keep this thin — only the two endpoints we need (create checkout + create
 * customer-portal URL) — to avoid pulling their SDK and its 400 KB of
 * peer-deps for two HTTP calls.
 *
 * Auth: Bearer JWT. Same key works in test mode and live mode of the
 * issuing account; the mode is determined by the store the request targets.
 */

const LS_API_BASE = 'https://api.lemonsqueezy.com/v1'

function authHeaders(): HeadersInit {
  const apiKey = process.env['LEMONSQUEEZY_API_KEY']
  if (!apiKey) throw new Error('LEMONSQUEEZY_API_KEY is not configured')
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/vnd.api+json',
    'Content-Type': 'application/vnd.api+json',
  }
}

export interface CheckoutInput {
  /** Maestring user.id — passed back via webhook custom_data so we can join. */
  userId: string
  /** Pre-fill the email field on the LS checkout. */
  email?: string
  /** Pre-fill name on the LS checkout. */
  name?: string
  /** URL to redirect to after a successful checkout (Vercel-deployed). */
  successUrl?: string
}

export interface CheckoutResult {
  url: string
  id: string
}

/**
 * Create a hosted-checkout session for the configured Pro Monthly variant.
 * Returns the URL the client redirects to (LS-hosted, on the seller's
 * subdomain like <store>.lemonsqueezy.com/checkout/buy/<uuid>).
 */
export async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const storeId = process.env['LEMONSQUEEZY_STORE_ID']
  const variantId = process.env['LEMONSQUEEZY_VARIANT_ID_PRO_MONTHLY']
  if (!storeId || !variantId) {
    throw new Error('LEMONSQUEEZY_STORE_ID or LEMONSQUEEZY_VARIANT_ID_PRO_MONTHLY missing')
  }

  const body = {
    data: {
      type: 'checkouts',
      attributes: {
        // Embed our user_id so the webhook can attribute the subscription.
        // LS forwards `custom` as `meta.custom_data` on every webhook event
        // related to this checkout / subscription.
        checkout_data: {
          email: input.email,
          name: input.name,
          custom: { user_id: input.userId },
        },
        checkout_options: {
          embed: false,
          media: false,
          logo: true,
        },
        product_options: {
          // Trial behaviour comes from the Variant config in LS dashboard
          // (7 days, requires payment method). No override needed here.
          enabled_variants: [Number(variantId)],
          redirect_url: input.successUrl ?? 'https://maestring.com/dashboard?checkout=success',
          receipt_button_text: 'Return to Maestring',
          receipt_link_url: input.successUrl ?? 'https://maestring.com/dashboard',
          receipt_thank_you_note: 'Welcome to Maestring Pro. Your trial is active.',
        },
      },
      relationships: {
        store: { data: { type: 'stores', id: String(storeId) } },
        variant: { data: { type: 'variants', id: String(variantId) } },
      },
    },
  }

  const res = await fetch(`${LS_API_BASE}/checkouts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`LS createCheckout failed (${res.status}): ${text.slice(0, 500)}`)
  }

  // Response shape: { data: { id, type: 'checkouts', attributes: { url, ... } } }
  const json = (await res.json()) as { data: { id: string; attributes: { url: string } } }
  return { url: json.data.attributes.url, id: json.data.id }
}

/**
 * Get a Customer Portal URL for an existing LS customer. The user can manage
 * (cancel / resume / update payment) via the LS-hosted portal.
 */
export async function getCustomerPortalUrl(lsCustomerId: string): Promise<string | null> {
  const res = await fetch(`${LS_API_BASE}/customers/${lsCustomerId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) return null
  const json = (await res.json()) as {
    data: { attributes: { urls?: { customer_portal?: string | null } } }
  }
  return json.data.attributes.urls?.customer_portal ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook signature verification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Constant-time HMAC-SHA256 verification of an LS webhook payload.
 * `rawBody` MUST be the exact bytes received (no JSON re-serialisation).
 */
export async function verifyLemonSqueezyWebhook(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!signatureHeader) return false
  const secret = process.env['LEMONSQUEEZY_WEBHOOK_SECRET']
  if (!secret) return false

  const { createHmac, timingSafeEqual } = await import('crypto')
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  if (expected.length !== signatureHeader.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader))
}

// ─────────────────────────────────────────────────────────────────────────────
// Status mapping LS → our internal "subscriptions" table format
// ─────────────────────────────────────────────────────────────────────────────

export type LSStatus =
  | 'on_trial' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'unpaid' | 'paused'

export interface InternalSubscriptionState {
  status: 'trialing' | 'active' | 'past_due' | 'canceled'
  cancel_at_period_end: boolean
}

export function mapLSStatus(ls: LSStatus, cancelled: boolean): InternalSubscriptionState {
  switch (ls) {
    case 'on_trial':
      return { status: 'trialing', cancel_at_period_end: cancelled }
    case 'active':
      return { status: 'active', cancel_at_period_end: cancelled }
    case 'past_due':
    case 'unpaid':
    case 'paused':
      return { status: 'past_due', cancel_at_period_end: cancelled }
    case 'cancelled':
    case 'expired':
      return { status: 'canceled', cancel_at_period_end: true }
  }
}
