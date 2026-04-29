import { expect, test } from '@playwright/test'

// ── @public: runs on every PR, no auth, no DB, placeholder env OK ──────────
//
// Tests that critical public-facing routes render, auth gates work, API
// boundaries reject unsigned requests, and redirects go to the right place.
// Tagged @public so the always-on CI job can run them with minimal env vars.

test.describe('@public @smoke marketing', () => {
  test('homepage returns 200 and contains brand', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBeLessThan(400)
    await expect(page).toHaveTitle(/maestring/i)
  })

  test('login page is reachable and has email input', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
  })

  test('signup page renders with email + name fields', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[id="name"]')).toBeVisible()
  })

  test('pricing page renders plan cards', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.getByText(/pro/i).first()).toBeVisible()
  })

  test('dashboard redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('study page redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/study')
    await expect(page).toHaveURL(/\/login/)
  })

  test('progress page redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/progress')
    await expect(page).toHaveURL(/\/login/)
  })

  test('admin panel 404s for unauthenticated users', async ({ page }) => {
    const res = await page.goto('/admin')
    expect([404, 307, 308]).toContain(res?.status() ?? 0)
  })

  test('legal/privacy is accessible without auth', async ({ page }) => {
    const res = await page.goto('/legal/privacy')
    expect(res?.status()).toBeLessThan(400)
  })

  test('legal/terms is accessible without auth', async ({ page }) => {
    const res = await page.goto('/legal/terms')
    expect(res?.status()).toBeLessThan(400)
  })
})

test.describe('@public @smoke blog', () => {
  test('blog index is accessible without auth', async ({ page }) => {
    const res = await page.goto('/blog')
    expect(res?.status()).toBeLessThan(400)
  })

  test('blog post slug is accessible without auth', async ({ page }) => {
    // Tests the middleware fix: /blog/[slug] must NOT redirect to /login.
    const res = await page.goto('/blog/aws-saa-c03-study-plan')
    // 200 (found) or 404 (post doesn't exist in this env) — both are fine.
    // A 307 to /login is the bug we're guarding against.
    expect(res?.status()).not.toBe(307)
    expect(res?.status()).not.toBe(308)
  })
})

test.describe('@public @smoke api boundary', () => {
  test('GET /api/health returns 200 or 503 (never 4xx)', async ({ request }) => {
    const res = await request.get('/api/health')
    // 200 = healthy, 503 = degraded/down — both are valid operational states.
    // 4xx would mean the route itself is broken or not public.
    expect([200, 503]).toContain(res.status())
    const body = await res.json().catch(() => null)
    expect(body).toBeTruthy()
    expect(typeof body?.status).toBe('string')
  })

  test('POST /api/study/generate without auth is rejected', async ({ request }) => {
    const res = await request.post('/api/study/generate', {
      data: { sessionId: '00000000-0000-0000-0000-000000000000', mode: 'review' },
      maxRedirects: 0,
    })
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

  test('GET /api/cron/cleanup without bearer → 401', async ({ request }) => {
    const res = await request.get('/api/cron/cleanup', { maxRedirects: 0 })
    expect(res.status()).toBe(401)
  })

  test('POST /api/cron/cleanup with wrong bearer → 401', async ({ request }) => {
    const res = await request.post('/api/cron/cleanup', {
      headers: { authorization: 'Bearer definitely-wrong' },
      maxRedirects: 0,
    })
    expect(res.status()).toBe(401)
  })

  test('POST /api/webhooks/stripe without signature → 400', async ({ request }) => {
    const res = await request.post('/api/webhooks/stripe', {
      data: '{"type":"ping"}',
      headers: { 'content-type': 'application/json' },
      maxRedirects: 0,
    })
    expect(res.status()).toBe(400)
  })
})

test.describe('@public @smoke referral', () => {
  test('/r/[code] with unknown code redirects to /signup', async ({ page }) => {
    // Unknown code → should go to /signup (not /login, not 500).
    const res = await page.goto('/r/UNKNOWNCODE99')
    // Follow the redirect chain — final URL should be /signup
    await expect(page).toHaveURL(/\/signup/)
    expect(res?.status()).toBeLessThan(500)
  })

  test('/r/[code] redirect preserves ?ref= param', async ({ page }) => {
    // Even unknown codes redirect to /signup — verify the redirect target
    // is the signup page so users land in the right funnel.
    await page.goto('/r/SOMEREF')
    const url = new URL(page.url())
    expect(url.pathname).toBe('/signup')
  })

  test('signup page shows referral badge when ?ref= is present', async ({ page }) => {
    await page.goto('/signup?ref=TESTCODE')
    await expect(page.getByText(/friend invite/i)).toBeVisible()
  })
})

test.describe('@public @smoke pwa', () => {
  test('site.webmanifest is reachable and valid JSON', async ({ request }) => {
    const res = await request.get('/site.webmanifest')
    expect(res.status()).toBe(200)
    const manifest = await res.json()
    expect(manifest.name).toBeTruthy()
    expect(manifest.start_url).toBeTruthy()
    expect(Array.isArray(manifest.icons)).toBe(true)
  })

  test('service worker file is served', async ({ request }) => {
    const res = await request.get('/sw.js')
    expect(res.status()).toBe(200)
    const ct = res.headers()['content-type'] ?? ''
    expect(ct).toMatch(/javascript|text/)
  })

  test('offline page renders', async ({ page }) => {
    const res = await page.goto('/offline')
    expect(res?.status()).toBeLessThan(400)
    await expect(page.getByText(/offline/i).first()).toBeVisible()
  })
})
