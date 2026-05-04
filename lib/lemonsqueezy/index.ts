/**
 * Lemon Squeezy client — replaces Stripe for billing.
 *
 * Lemon Squeezy acts as a Merchant of Record (MoR) which means LS itself
 * is the legal seller; we don't need a Spanish autónomo registration to
 * accept payments. LS handles VAT/sales tax globally and pays us as a
 * vendor (income declared as personal income on Modelo 100 IRPF).
 *
 * Trade-off vs Stripe: 5% + $0.50 per transaction (vs Stripe's 1.4% +
 * €0.25). Worth it while we don't have a registered business entity.
 *
 * The full /v1 REST API: https://docs.lemonsqueezy.com/api
 * Webhook events: https://docs.lemonsqueezy.com/help/webhooks
 */

const API_BASE = 'https://api.lemonsqueezy.com/v1'

function authHeaders(): HeadersInit {
  const key = process.env['LEMONSQUEEZY_API_KEY']
  if (!key) throw new Error('LEMONSQUEEZY_API_KEY is not configured')
  return {
    Authorization: `Bearer ${key}`,
    Accept: 'application/vnd.api+json',
    'Content-Type': 'application/vnd.api+json',
  }
}

export interface CreateCheckoutParams {
  userId: string
  email?: string | null
  successUrl: string
  /**
   * Custom field that flows through to webhooks via subscription.attributes.custom_data.
   * We store userId here so the webhook can resolve which user the new sub belongs to.
   */
  customData?: Record<string, string>
}

export interface CheckoutResponse {
  url: string
  expiresAt: string
}

/**
 * Creates a checkout URL for the configured Pro Monthly variant.
 * Card is collected upfront (LS default for subscription products);
 * the 7-day trial is configured per-variant in the LS dashboard.
 */
export async function createCheckout(params: CreateCheckoutParams): Promise<CheckoutResponse> {
  const storeId = process.env['LEMONSQUEEZY_STORE_ID']
  const variantId = process.env['LEMONSQUEEZY_VARIANT_ID_PRO_MONTHLY']
  if (!storeId || !variantId) throw new Error('LEMONSQUEEZY store/variant IDs not configured')

  const body = {
    data: {
      type: 'checkouts',
      attributes: {
        // checkout_data lets us prefill / pass custom data to the order + sub.
        checkout_data: {
          email: params.email ?? undefined,
          custom: { user_id: params.userId, ...(params.customData ?? {}) },
        },
        // Where to send the user on success.
        product_options: {
          redirect_url: params.successUrl,
        },
        checkout_options: {
          embed: false,
          dark: true,
        },
      },
      relationships: {
        store: { data: { type: 'stores', id: String(storeId) } },
        variant: { data: { type: 'variants', id: String(variantId) } },
      },
    },
  }

  const res = await fetch(`${API_BASE}/checkouts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`LS createCheckout failed: ${res.status} ${errBody.slice(0, 300)}`)
  }
  const json = await res.json()
  const url = json?.data?.attributes?.url
  const expiresAt = json?.data?.attributes?.expires_at
  if (typeof url !== 'string') throw new Error('LS createCheckout: missing url in response')
  return { url, expiresAt: typeof expiresAt === 'string' ? expiresAt : '' }
}

/**
 * Customer-facing self-service portal where they can update card / cancel /
 * resume. LS calls this "customer portal" and provides per-customer URLs;
 * we resolve the URL by fetching the subscription and reading
 * `attributes.urls.customer_portal`.
 */
export async function getCustomerPortalUrl(lsSubscriptionId: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/subscriptions/${lsSubscriptionId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) return null
  const json = await res.json()
  const url = json?.data?.attributes?.urls?.customer_portal
  return typeof url === 'string' ? url : null
}

/**
 * Map LS subscription status names to our internal subscription_status enum.
 *
 * LS values:
 *   on_trial   — has not paid yet, trial active (cancellable)
 *   active     — paying
 *   paused     — auto-pause feature enabled by store admin
 *   past_due   — last payment failed, retry scheduled
 *   unpaid     — payment retries exhausted; sub effectively dead
 *   cancelled  — user cancelled (still has access until period_end)
 *   expired    — period_end passed for a cancelled sub
 */
export type LemonSqueezyStatus =
  | 'on_trial' | 'active' | 'paused' | 'past_due' | 'unpaid' | 'cancelled' | 'expired'

export function mapLemonSqueezyStatus(s: string): 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' {
  switch (s) {
    case 'on_trial': return 'trialing'
    case 'active':   return 'active'
    case 'past_due': return 'past_due'
    case 'unpaid':
    case 'cancelled':
    case 'expired':
    case 'paused':   return 'canceled'
    default:         return 'incomplete'
  }
}
