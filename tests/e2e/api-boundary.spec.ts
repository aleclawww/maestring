import { expect, test } from '@playwright/test'

// Boundary checks for API routes: auth gates, cron bearer, webhook signature.
// These are the seams where silent breakage has cost us before (onboarding gate
// returning an HTML redirect to a JSON fetch, cron endpoints accessible without
// the bearer). No DB fixtures or LLM stubs needed — we assert on status codes
// and basic response shape.
test.describe('@public @smoke api boundary', () => {
  test('POST /api/study/generate without auth is rejected (no 2xx)', async ({ request }) => {
    const res = await request.post('/api/study/generate', {
      data: { sessionId: '00000000-0000-0000-0000-000000000000', mode: 'review' },
      maxRedirects: 0,
    })
    // Middleware 307 → /login, or handler 401/403. Anything but 2xx is fine.
    expect(res.status()).toBeGreaterThanOrEqual(300)
    expect(res.status()).toBeLessThan(500)
  })

  test('POST /api/study/evaluate without auth is rejected', async ({ request }) => {
    const res = await request.post('/api/study/evaluate', {
      data: {},
      maxRedirects: 0,
    })
    expect(res.status()).toBeGreaterThanOrEqual(300)
    expect(res.status()).toBeLessThan(500)
  })

  // Vercel Cron invokes with GET (vercel.json). Test both methods so a future
  // route handler that drops GET silently regresses production instead of CI.
  test('GET /api/cron/cleanup without bearer → 401', async ({ request }) => {
    const res = await request.get('/api/cron/cleanup', { maxRedirects: 0 })
    expect(res.status()).toBe(401)
  })

  test('POST /api/cron/cleanup without bearer → 401', async ({ request }) => {
    const res = await request.post('/api/cron/cleanup', { maxRedirects: 0 })
    expect(res.status()).toBe(401)
  })

  test('GET /api/cron/cleanup with wrong bearer → 401', async ({ request }) => {
    const res = await request.get('/api/cron/cleanup', {
      headers: { authorization: 'Bearer not-the-real-secret' },
      maxRedirects: 0,
    })
    expect(res.status()).toBe(401)
  })

  test('POST /api/webhooks/stripe without signature → 400', async ({ request }) => {
    // Public prefix in middleware, so it reaches the handler. Handler must
    // reject missing sig header before doing anything.
    const res = await request.post('/api/webhooks/stripe', {
      data: '{"type":"ping"}',
      headers: { 'content-type': 'application/json' },
      maxRedirects: 0,
    })
    expect(res.status()).toBe(400)
  })

  test('POST /api/webhooks/stripe with bad signature → 400', async ({ request }) => {
    const res = await request.post('/api/webhooks/stripe', {
      data: '{"type":"ping"}',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=1,v1=deadbeef',
      },
      maxRedirects: 0,
    })
    expect(res.status()).toBe(400)
  })
})
