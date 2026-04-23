import { expect, test } from '@playwright/test'

// Smoke: marketing homepage renders + login page reachable. Full auth + study
// flow E2E needs a seeded Supabase test DB — out of scope for this pass.
test.describe('@smoke marketing', () => {
  test('homepage returns 200 and contains brand', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBeLessThan(400)
    await expect(page).toHaveTitle(/maestring/i)
  })

  test('login page is reachable and has email input', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
  })

  test('pricing page renders plan cards', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.getByText(/pro/i).first()).toBeVisible()
  })

  test('dashboard redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('admin panel 404s for non-admins', async ({ page }) => {
    const res = await page.goto('/admin')
    expect([404, 307, 308]).toContain(res?.status() ?? 0)
  })
})
