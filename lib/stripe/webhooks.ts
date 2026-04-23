import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SubscriptionPlan, SubscriptionStatus } from '@/types/database'
import logger from '@/lib/logger'

export function mapStripePlan(priceId: string): SubscriptionPlan {
  if (priceId === process.env.STRIPE_PRICE_PRO_ANNUAL) return 'pro_annual'
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) return 'pro'
  return 'free'
}

export function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  const map: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
    incomplete: 'incomplete',
    incomplete_expired: 'canceled',
    unpaid: 'past_due',
    paused: 'canceled',
  }
  return map[status] ?? 'canceled'
}

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const supabase = createAdminClient()
  const userId = session.client_reference_id
  if (!userId) throw new Error('No userId in session')

  const subscriptionId = session.subscription as string
  const customerId = session.customer as string

  // Get subscription details
  const stripe = (await import('./index')).getStripe()
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = subscription.items.data[0]?.price.id ?? ''
  const plan = mapStripePlan(priceId)

  const { error } = await supabase.from('subscriptions').upsert({
    user_id: userId,
    plan,
    status: mapStripeStatus(subscription.status),
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: priceId,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
  }, { onConflict: 'user_id' })

  if (error) {
    logger.error({ error, userId }, 'Failed to upsert subscription on checkout')
    throw error
  }

  // Apply referral credit if any. Don't fail the webhook — the subscription
  // upsert above is the must-commit path; a missing referral credit is
  // recoverable by support. But DO log so we see it instead of eating it.
  const referralCode = session.metadata?.['referralCode']
  if (referralCode) {
    const { error: referralErr } = await supabase.from('referrals')
      .update({ converted_at: new Date().toISOString(), credit_applied: true })
      .eq('code', referralCode)
      .eq('referred_id', userId)
    if (referralErr) {
      logger.error(
        { err: referralErr, userId, referralCode },
        'Failed to apply referral credit (subscription still created)'
      )
    }
  }

  logger.info({ userId, plan }, 'Checkout completed, subscription created')
}

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const supabase = createAdminClient()
  const priceId = subscription.items.data[0]?.price.id ?? ''
  const plan = mapStripePlan(priceId)

  const { error } = await supabase.from('subscriptions')
    .update({
      plan,
      status: mapStripeStatus(subscription.status),
      stripe_price_id: priceId,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    logger.error({ err: error, subscriptionId: subscription.id }, 'Failed to update subscription')
    // Throw so the webhook route returns 5xx and Stripe retries — otherwise
    // plan/status changes get silently dropped on transient DB failures.
    throw error
  }
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('subscriptions')
    .update({
      plan: 'free',
      status: 'canceled',
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    logger.error({ err: error, subscriptionId: subscription.id }, 'Failed to delete subscription')
    // Must retry — otherwise a user keeps Pro access after canceling because
    // the webhook silently ate a transient DB error. Stripe will redeliver.
    throw error
  }
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const supabase = createAdminClient()
  const subscriptionId = invoice.subscription as string

  // Flip the user to past_due so the UI / rate-limit can react. If this write
  // fails we must surface it — silently swallowing means the user keeps full
  // Pro access after a failed payment, which is a revenue + fairness bug.
  const { error } = await supabase.from('subscriptions')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) {
    logger.error(
      { err: error, subscriptionId },
      'Failed to mark subscription past_due after invoice.payment_failed'
    )
    // Throw so the webhook route returns non-2xx and Stripe retries. Better
    // to be delivered twice (handler is idempotent on status) than to drop
    // the state transition on the floor.
    throw error
  }

  logger.warn({ subscriptionId }, 'Invoice payment failed')
}

export async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const supabase = createAdminClient()
  const subscriptionId = invoice.subscription as string

  // Flip the user back to active after a successful retry. Same reasoning as
  // handleInvoicePaymentFailed: we cannot leave the user stuck in past_due
  // just because a transient DB error silently dropped the update.
  const { error } = await supabase.from('subscriptions')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) {
    logger.error(
      { err: error, subscriptionId },
      'Failed to mark subscription active after invoice.payment_succeeded'
    )
    throw error
  }

  logger.info({ subscriptionId }, 'Invoice payment succeeded')
}
