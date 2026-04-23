import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mapStripePlan, mapStripeStatus } from '@/lib/stripe/webhooks'
import type Stripe from 'stripe'

const ORIGINAL_ANNUAL = process.env.STRIPE_PRICE_PRO_ANNUAL
const ORIGINAL_MONTHLY = process.env.STRIPE_PRICE_PRO_MONTHLY

describe('stripe webhooks — mapStripePlan', () => {
  beforeEach(() => {
    process.env.STRIPE_PRICE_PRO_ANNUAL = 'price_annual_123'
    process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_monthly_456'
  })
  afterEach(() => {
    process.env.STRIPE_PRICE_PRO_ANNUAL = ORIGINAL_ANNUAL
    process.env.STRIPE_PRICE_PRO_MONTHLY = ORIGINAL_MONTHLY
  })

  it('maps annual price id to pro_annual', () => {
    expect(mapStripePlan('price_annual_123')).toBe('pro_annual')
  })

  it('maps monthly price id to pro', () => {
    expect(mapStripePlan('price_monthly_456')).toBe('pro')
  })

  it('falls back to free for unknown price', () => {
    expect(mapStripePlan('price_unknown_999')).toBe('free')
  })

  it('falls back to free for empty string (defensive)', () => {
    // If env vars are also empty, an empty-string priceId would accidentally
    // match ''. Guard against that misconfiguration.
    delete process.env.STRIPE_PRICE_PRO_ANNUAL
    delete process.env.STRIPE_PRICE_PRO_MONTHLY
    expect(mapStripePlan('')).toBe('free')
  })
})

describe('stripe webhooks — mapStripeStatus', () => {
  // Paid-and-healthy buckets: user should have Pro access.
  it.each<[Stripe.Subscription.Status, string]>([
    ['active', 'active'],
    ['trialing', 'trialing'],
  ])('maps %s → %s (Pro access)', (input, expected) => {
    expect(mapStripeStatus(input)).toBe(expected)
  })

  // Unpaid / failing bucket: user is still Pro but flagged for follow-up.
  it.each<[Stripe.Subscription.Status, string]>([
    ['past_due', 'past_due'],
    ['unpaid', 'past_due'],
  ])('maps %s → past_due (recovery path)', (input, expected) => {
    expect(mapStripeStatus(input)).toBe(expected)
  })

  // Dead buckets: user must lose Pro.
  it.each<[Stripe.Subscription.Status, string]>([
    ['canceled', 'canceled'],
    ['incomplete_expired', 'canceled'],
    ['paused', 'canceled'],
  ])('maps %s → canceled (loses Pro)', (input, expected) => {
    expect(mapStripeStatus(input)).toBe(expected)
  })

  it('maps incomplete → incomplete (awaiting first payment)', () => {
    expect(mapStripeStatus('incomplete')).toBe('incomplete')
  })

  it('covers every Stripe.Subscription.Status exhaustively', () => {
    // If Stripe adds a new status in a future SDK bump, TypeScript will flag
    // a missing key in the `map` literal in webhooks.ts. This runtime check
    // asserts that every currently-known status has a mapping and returns
    // something non-null.
    const allStatuses: Stripe.Subscription.Status[] = [
      'active', 'past_due', 'unpaid', 'canceled', 'incomplete',
      'incomplete_expired', 'trialing', 'paused',
    ]
    for (const s of allStatuses) {
      const mapped = mapStripeStatus(s)
      expect(['active', 'trialing', 'past_due', 'canceled', 'incomplete']).toContain(mapped)
    }
  })
})
