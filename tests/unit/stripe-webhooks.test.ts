import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mapStripePlan, mapStripeStatus } from '@/lib/stripe/webhooks'
import type Stripe from 'stripe'

// Chainable Supabase-style builder used by the handler tests below. We hoist
// so the vi.mock factory can reach it without TDZ errors.
//
// Design: all chaining methods return `builder` itself. `builder` is made
// thenable (has a `.then()`) so `await builder` resolves to { data, error }
// regardless of where in the chain the `await` lands. This allows the mock to
// support both short chains (`await .update().eq(...)`) and extended chains
// (`await .update().eq().select().maybeSingle()`).
const supabaseMock = vi.hoisted(() => {
  const state: { updateError: { message: string } | null } = { updateError: null }

  const builder: Record<string, unknown> = {}

  // Thenable: makes `await builder` resolve to { data: null, error }.
  builder['then'] = (
    resolve: (v: { data: null; error: typeof state.updateError }) => void,
    reject: (e: unknown) => void
  ) => {
    Promise.resolve({ data: null, error: state.updateError }).then(resolve, reject)
  }
  builder['catch'] = (onRejected: (e: unknown) => void) =>
    Promise.resolve({ data: null, error: state.updateError }).catch(onRejected)
  builder['finally'] = (onFinally: () => void) =>
    Promise.resolve({ data: null, error: state.updateError }).finally(onFinally)

  // All chaining methods return builder so calls can be arbitrarily composed.
  for (const method of [
    'from', 'update', 'eq', 'neq', 'select', 'insert', 'upsert', 'delete',
    'is', 'lt', 'lte', 'gte', 'gt', 'in', 'order', 'limit',
    'single', 'maybeSingle', 'count',
  ]) {
    builder[method] = vi.fn(() => builder)
  }

  const from = vi.fn(() => builder)
  return {
    state,
    builder,
    from,
    client: { from } as unknown as { from: typeof from },
  }
})

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => supabaseMock.client,
}))
vi.mock('@/lib/logger', () => {
  const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() }
  return { default: logger, logger }
})

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

// -----------------------------------------------------------------------------
// Handler error-propagation tests.
//
// Background: every handler here writes to Postgres via the Supabase admin
// client. Previously some of them did `await supabase.from(...).update(...)`
// without inspecting the `{ error }` return, so a transient DB failure would
// silently drop the state transition. Stripe would see a 200 and never retry.
//
// The fix is to throw on `error` so the webhook route returns 5xx and Stripe
// redelivers the event. These tests pin that contract.
// -----------------------------------------------------------------------------
describe('stripe webhooks — handler error propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseMock.state.updateError = null
  })

  function fakeInvoice(subscriptionId = 'sub_test_1'): Stripe.Invoice {
    return { subscription: subscriptionId } as unknown as Stripe.Invoice
  }
  function fakeSubscription(id = 'sub_test_1'): Stripe.Subscription {
    return {
      id,
      status: 'active',
      cancel_at_period_end: false,
      current_period_start: 1_700_000_000,
      current_period_end: 1_702_000_000,
      items: { data: [{ price: { id: 'price_monthly_456' } }] },
    } as unknown as Stripe.Subscription
  }

  it('handleInvoicePaymentFailed throws when the update returns an error', async () => {
    supabaseMock.state.updateError = { message: 'connection reset by peer' }
    const { handleInvoicePaymentFailed } = await import('@/lib/stripe/webhooks')
    await expect(handleInvoicePaymentFailed(fakeInvoice())).rejects.toMatchObject({
      message: 'connection reset by peer',
    })
  })

  it('handleInvoicePaymentFailed resolves quietly when the update succeeds', async () => {
    supabaseMock.state.updateError = null
    const { handleInvoicePaymentFailed } = await import('@/lib/stripe/webhooks')
    await expect(handleInvoicePaymentFailed(fakeInvoice())).resolves.toBeUndefined()
  })

  it('handleInvoicePaymentSucceeded throws when the update returns an error', async () => {
    supabaseMock.state.updateError = { message: 'deadlock detected' }
    const { handleInvoicePaymentSucceeded } = await import('@/lib/stripe/webhooks')
    await expect(handleInvoicePaymentSucceeded(fakeInvoice())).rejects.toMatchObject({
      message: 'deadlock detected',
    })
  })

  it('handleSubscriptionUpdated throws when the update returns an error', async () => {
    supabaseMock.state.updateError = { message: 'row level security violation' }
    const { handleSubscriptionUpdated } = await import('@/lib/stripe/webhooks')
    await expect(handleSubscriptionUpdated(fakeSubscription())).rejects.toMatchObject({
      message: 'row level security violation',
    })
  })

  it('handleSubscriptionDeleted throws when the update returns an error', async () => {
    supabaseMock.state.updateError = { message: 'statement timeout' }
    const { handleSubscriptionDeleted } = await import('@/lib/stripe/webhooks')
    await expect(handleSubscriptionDeleted(fakeSubscription())).rejects.toMatchObject({
      message: 'statement timeout',
    })
  })
})
