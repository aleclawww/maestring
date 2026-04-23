import { expect, test } from '@playwright/test'

// Authenticated smoke. Relies on the test-auth shim at /api/test/login, which
// is only active when ALLOW_TEST_AUTH=1 is set on the Next server. Skip the
// whole suite if the env flag isn't present so `npm run test:e2e` stays green
// in minimal setups.
const enabled = process.env['ALLOW_TEST_AUTH'] === '1'

test.describe('@smoke authenticated', () => {
  test.skip(!enabled, 'Set ALLOW_TEST_AUTH=1 on the server to run authenticated specs')

  test.beforeEach(async ({ request, context }) => {
    // Mint a session. The shim sets Supabase auth cookies on the response;
    // copy them into the browser context so subsequent page.goto() calls are
    // authenticated.
    const res = await request.post('/api/test/login', {
      data: { email: 'e2e-fixture@maestring.test' },
    })
    expect(res.ok()).toBe(true)

    const cookies = await request.storageState()
    await context.addCookies(cookies.cookies)
  })

  test('dashboard renders for authenticated user (no login redirect)', async ({ page }) => {
    const res = await page.goto('/dashboard')
    expect(res?.status()).toBeLessThan(400)
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page).not.toHaveURL(/\/onboarding/)
  })

  test('study page is reachable', async ({ page }) => {
    const res = await page.goto('/study')
    expect(res?.status()).toBeLessThan(400)
    await expect(page).not.toHaveURL(/\/login/)
  })
})
