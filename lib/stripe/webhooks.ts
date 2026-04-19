import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SubscriptionPlan, SubscriptionStatus } from '@/types/database'
import logger from '@/lib/logger'

function mapStripePlan(priceId: string): SubscriptionPlan {
  if (priceId === process.env.STRIPE_PRICE_PRO_ANNUAL) return 'pro_annual'
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) return 'pro'
  return 'free'
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
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

  // Apply referral credit if any
  const referralCode = session.metadata?.['referralCode']
  if (referralCode) {
    await supabase.from('referrals')
      .update({ converted_at: new Date().toISOString(), credit_applied: true })
      .eq('code', referralCode)
      .eq('referred_id', userId)
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
    logger.error({ error, subscriptionId: subscription.id }, 'Failed to update subscription')
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
    logger.error({ error, subscriptionId: subscription.id }, 'Failed to delete subscription')
  }
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const supabase = createAdminClient()
  const subscriptionId = invoice.subscription as string

  await supabase.from('subscriptions')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscriptionId)

  logger.warn({ subscriptionId }, 'Invoice payment failed')
}

export async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const supabase = createAdminClient()
  const subscriptionId = invoice.subscription as string

  await supabase.from('subscriptions')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscriptionId)

  logger.info({ subscriptionId }, 'Invoice payment succeeded')
}
