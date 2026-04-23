# E2E tests (Playwright)

Smoke suite covers unauthenticated entry points only. The full authenticated
study flow (signup → onboarding → study → evaluate → readiness) requires a
seeded Supabase test database and a test-mode auth shim; tracked as follow-up.

## Running locally

```bash
npm run build && npm run test:e2e
```

Playwright boots `next start` on port 3000 automatically (see
`playwright.config.ts`). Set `PLAYWRIGHT_NO_WEBSERVER=1` to reuse an already-
running server.

## Environment

The smoke suite does not require real Supabase / Stripe credentials, but
`next start` does — wire `.env.local` before running or the marketing pages
may crash during build.
