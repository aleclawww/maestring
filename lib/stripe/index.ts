import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured')
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2024-06-20',
      typescript: true,
      appInfo: {
        name: 'Maestring',
        version: '0.1.0',
      },
    })
  }
  return stripeInstance
}

/**
 * 7-day free trial for ALL Pro signups (referralCode no longer gates it).
 * Stripe collects the card upfront, charges $0 today, automatically converts
 * to a paid subscription on day 8 unless the user cancels via the portal.
 *
 * Trial settings:
 *   - `payment_method_collection: 'always'` is the default for subscription
 *     mode → card is required at checkout.
 *   - `missing_payment_method: 'cancel'` → if the card fails on day 8 we
 *     cancel cleanly instead of leaving the sub in `past_due`.
 *   - The customer.subscription.trial_will_end webhook (already handled in
 *     lib/stripe/webhooks.ts) fires 3 days before expiry to send the
 *     reminder email via Resend.
 */
const TRIAL_DAYS = 7

export async function createCheckoutSession(
  userId: string,
  priceId: string,
  referralCode?: string
): Promise<string> {
  const stripe = getStripe()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://maestring.com'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/dashboard?checkout=success`,
    cancel_url: `${siteUrl}/pricing?checkout=canceled`,
    client_reference_id: userId,
    allow_promotion_codes: true,
    metadata: {
      userId,
      referralCode: referralCode ?? '',
    },
    subscription_data: {
      metadata: { userId },
      trial_period_days: TRIAL_DAYS,
      trial_settings: {
        end_behavior: { missing_payment_method: 'cancel' },
      },
    },
  })

  if (!session.url) throw new Error('No checkout URL returned')
  return session.url
}

export async function createPortalSession(
  customerId: string,
  returnUrl?: string
): Promise<{ url: string }> {
  const stripe = getStripe()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://maestring.com'

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl ?? `${siteUrl}/settings?tab=subscription`,
  })

  return { url: session.url }
}

export async function getPrices() {
  const stripe = getStripe()
  const prices = await stripe.prices.list({
    active: true,
    expand: ['data.product'],
  })
  return prices.data
}

export async function getCustomer(customerId: string) {
  const stripe = getStripe()
  return stripe.customers.retrieve(customerId)
}
