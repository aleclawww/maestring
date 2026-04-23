# E2E tests (Playwright)

Three smoke suites:

- `smoke.spec.ts` — marketing + redirect gates (unauth)
- `api-boundary.spec.ts` — API auth/signature gates (unauth)
- `authenticated.spec.ts` — dashboard + study reachable as a logged-in user. Skipped unless `ALLOW_TEST_AUTH=1` is set on the Next server.
- `study-loop.spec.ts` — one round-trip (setup → question → feedback) with `/api/study/*` stubbed via `page.route()`. Same skip gate as above. Validates the client reducer + UI without burning LLM credits.

## Test-auth shim

`app/api/test/login/route.ts` mints a Supabase session for a fixture user
(`e2e-fixture@maestring.test`). It is gated by two conditions — if either is
false, the route returns 404 as if it didn't exist:

1. `ALLOW_TEST_AUTH=1` must be set in the Next server's environment
2. `NODE_ENV !== 'production'`

**Do not set `ALLOW_TEST_AUTH` in production**. The flag is for local dev + CI
only. The middleware only exposes `/api/test/` as a public prefix when the
flag is on, so the endpoint is inert without it.

## Running authenticated specs locally

```bash
ALLOW_TEST_AUTH=1 npm run build
ALLOW_TEST_AUTH=1 npm run test:e2e
```

The shim needs `SUPABASE_SERVICE_ROLE_KEY` to create the fixture user, so use
`.env.local` with a real (dev) Supabase project.

## CI

`.github/workflows/ci.yml` job `e2e-smoke` runs `npm run test:e2e -- --grep @smoke`
on every push/PR, with `ALLOW_TEST_AUTH=1`. The `SUPABASE_*` secrets on the
repo **must point at a dedicated CI/staging project, not production** — the
shim creates a fixture user (`e2e-fixture@maestring.test`). Auditing: the
fixture user's email is unique enough to `LEFT JOIN` and purge periodically.

### Prod-URL guardrail

Set the **repository variable** `PROD_SUPABASE_URL` (Settings → Secrets and
variables → Actions → Variables) to the production Supabase URL. The
`Assert non-prod Supabase target` step in `e2e-smoke` fails the job if
`NEXT_PUBLIC_SUPABASE_URL` matches it — prevents accidentally running the
test-auth shim against prod after a secret copy-paste.

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
