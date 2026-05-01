import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SubscriptionPlan, SubscriptionStatus } from '@/types/database'
import logger from '@/lib/logger'
import { trackServer } from '@/lib/analytics-server'

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
    const { data: referralRow, error: referralErr } = await supabase.from('referrals')
      .update({ converted_at: new Date().toISOString(), credit_applied: true })
      .eq('code', referralCode)
      .eq('referred_id', userId)
      .select('referrer_id')
      .maybeSingle()
    if (referralErr) {
      logger.error(
        { err: referralErr, userId, referralCode },
        'Failed to apply referral credit (subscription still created)'
      )
    } else if (referralRow) {
      const amountUsd = session.amount_total ? session.amount_total / 100 : undefined
      await trackServer(userId, {
        name: 'referral_converted',
        properties: { referrer_user_id: referralRow.referrer_id, price_usd: amountUsd },
      })
    }
  }

  logger.info({ userId, plan }, 'Checkout completed, subscription created')

  await trackServer(userId, { name: 'subscription_created', properties: { plan } })
}

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const supabase = createAdminClient()
  const priceId = subscription.items.data[0]?.price.id ?? ''
  const plan = mapStripePlan(priceId)

  const { data, error } = await supabase.from('subscriptions')
    .update({
      plan,
      status: mapStripeStatus(subscription.status),
      stripe_price_id: priceId,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      // trial_end must be synced here: when Stripe transitions trialing → active,
      // the trial_end timestamp is set on the subscription object. Without syncing
      // it, the DB column stays NULL forever and any UI reading it to show
      // "your trial ends in X days" would never render correctly.
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)
    .select('user_id')
    .maybeSingle()

  if (error) {
    logger.error({ err: error, subscriptionId: subscription.id }, 'Failed to update subscription')
    // Throw so the webhook route returns 5xx and Stripe retries — otherwise
    // plan/status changes get silently dropped on transient DB failures.
    throw error
  }

  // If the row doesn't exist yet (e.g. customer.subscription.updated fired
  // before checkout.session.completed due to out-of-order delivery), the
  // UPDATE touches 0 rows and returns no error — the plan/status change is
  // silently dropped. Throw so Stripe retries; checkout.session.completed
  // will eventually create the row and this event will succeed on replay.
  if (!data) {
    logger.warn(
      { subscriptionId: subscription.id, plan, status: subscription.status },
      'handleSubscriptionUpdated: no matching subscription row — throwing to force Stripe retry'
    )
    throw new Error(`No subscription row found for stripe_subscription_id=${subscription.id}`)
  }
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('subscriptions')
    .update({
      plan: 'free',
      status: 'canceled',
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)
    .select('user_id')
    .maybeSingle()

  if (error) {
    logger.error({ err: error, subscriptionId: subscription.id }, 'Failed to delete subscription')
    // Must retry — otherwise a user keeps Pro access after canceling because
    // the webhook silently ate a transient DB error. Stripe will redeliver.
    throw error
  }

  if (data?.user_id) {
    await trackServer(data.user_id, { name: 'subscription_cancelled' })
  }
}

export async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  // customer.subscription.trial_will_end fires 3 days before trial expiry.
  // Look up the user linked to this subscription and send them a heads-up email
  // so they can decide whether to upgrade before losing access to premium features.
  const supabase = createAdminClient()

  const { data: row, error } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, subscriptionId: subscription.id }, 'handleTrialWillEnd: failed to find subscription')
    throw error
  }
  if (!row?.user_id) {
    logger.warn({ subscriptionId: subscription.id }, 'handleTrialWillEnd: no matching subscription row — skipping email')
    return
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email_nudges_enabled')
    .eq('id', row.user_id)
    .maybeSingle()

  // Respect the user's email preference — trial ending is a transactional
  // notice so we still send it even if nudges are disabled, but we check the
  // `email_nudges_enabled` flag as a courtesy opt-out signal for very noisy
  // users who have explicitly turned off all emails.
  if (profile?.email_nudges_enabled === false) {
    logger.info({ userId: row.user_id }, 'handleTrialWillEnd: user opted out of emails — skipping')
    return
  }

  const { data: authUser } = await supabase.auth.admin.getUserById(row.user_id)
  const email = authUser?.user?.email
  if (!email) {
    logger.warn({ userId: row.user_id }, 'handleTrialWillEnd: no email on auth user — skipping')
    return
  }

  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

  const now = new Date()
  const daysRemaining = Math.max(
    1,
    Math.round((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  )
  const trialEndDate = trialEnd.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })

  const firstName = profile?.full_name
    ? profile.full_name.split(' ')[0]
    : 'there'

  const siteUrl = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://maestring.com'

  // Wrap email in try/catch: a transient Resend outage must NOT cause Stripe
  // to retry the webhook endlessly. The subscription state is already correct
  // (we're just sending a notification). Log the failure so ops can manually
  // trigger the email if needed, but return cleanly so the event is marked
  // processed and Stripe backs off.
  try {
    const { TrialEndingEmail } = await import('@/lib/email/templates/TrialEndingEmail')
    const { sendEmail } = await import('@/lib/email')

    await sendEmail({
      to: email,
      subject: daysRemaining <= 1
        ? 'Your Maestring trial ends today'
        : `Your Maestring trial ends in ${daysRemaining} days`,
      react: TrialEndingEmail({
        firstName,
        daysRemaining,
        trialEndDate,
        upgradeUrl: `${siteUrl}/pricing?ref=trial-ending`,
        studyUrl: `${siteUrl}/study`,
      }),
      tags: [{ name: 'type', value: 'trial-ending' }],
    })

    logger.info(
      { userId: row.user_id, daysRemaining, subscriptionId: subscription.id },
      'Trial-ending email sent'
    )
  } catch (emailErr) {
    // Non-fatal: log but do not rethrow. The webhook must still succeed so
    // Stripe stops retrying — a failed reminder email is recoverable via
    // manual resend, a Stripe retry loop is not.
    logger.error(
      { err: emailErr, userId: row.user_id, subscriptionId: subscription.id },
      'handleTrialWillEnd: email send failed — webhook will still succeed'
    )
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

  // Retrieve the subscription from Stripe to get the updated period boundaries.
  // `invoice.payment_succeeded` fires on every renewal but does not embed the
  // new `current_period_end` directly. Without this, if `customer.subscription.updated`
  // is delayed or dropped, the DB keeps the old (past) current_period_end, and
  // any gate that checks `current_period_end < now()` would wrongly block a
  // paying user who renewed successfully.
  //
  // Note: getStripe() is inside the try block intentionally. If STRIPE_SECRET_KEY
  // is not configured (misconfigured env, test environment), we degrade to a
  // status-only update rather than throwing before reaching the DB write.
  let periodEnd: string | undefined
  try {
    const stripe = (await import('./index')).getStripe()
    const sub = await stripe.subscriptions.retrieve(subscriptionId)
    periodEnd = new Date(sub.current_period_end * 1000).toISOString()
  } catch (stripeErr) {
    // Non-fatal: log and proceed with status-only update. The subscription.updated
    // event that Stripe also fires will carry the correct period boundaries.
    logger.warn({ err: stripeErr, subscriptionId }, 'invoice.payment_succeeded: failed to retrieve subscription for period_end sync')
  }

  const update: Record<string, unknown> = {
    status: 'active',
    updated_at: new Date().toISOString(),
  }
  if (periodEnd) update['current_period_end'] = periodEnd

  const { error } = await supabase.from('subscriptions')
    .update(update)
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
