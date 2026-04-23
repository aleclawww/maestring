# CI & branch-protection setup

One-time configuration for this repo's GitHub Actions + merge gates. Rerun
after renaming a workflow job or adding a new required check.

## Repository variables (Settings → Secrets and variables → Actions → Variables)

| Name | Value | Purpose |
|---|---|---|
| `PROD_SUPABASE_URL` | `https://<prod-ref>.supabase.co` | Guardrail — `e2e-smoke` fails if CI points at prod |

## Repository secrets (same page → Secrets tab)

Point `SUPABASE_*` at a **dedicated CI/staging Supabase project**, not prod.
The test-auth shim creates a fixture user; you don't want those in prod.

Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
`RESEND_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

## Branch protection for `main`

Settings → Branches → Add branch ruleset (or classic Branch protection rules).

**Protected branch pattern:** `main`

**Require a pull request before merging:** on
- Require approvals: 0 (solo dev) or 1 (team)
- Dismiss stale approvals when new commits are pushed: on

**Require status checks to pass before merging:** on
- Require branches to be up to date before merging: on
- **Required checks** (add each by name — they must have run at least once
  for GitHub to recognize them):
  - `TypeScript`
  - `ESLint`
  - `Unit tests`
  - `Build`
  - `E2E smoke (Playwright)`

(These are the `name:` fields from `.github/workflows/ci.yml`, not the job ids.)

**Do not allow bypassing the above settings:** on (except for repo admins
during incident response).

**Restrict force-pushes:** on.

## Optional: via `gh` CLI

If you have `gh` installed and authenticated:

```bash
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/<owner>/<repo>/branches/main/protection" \
  -f "required_status_checks[strict]=true" \
  -f "required_status_checks[contexts][]=TypeScript" \
  -f "required_status_checks[contexts][]=ESLint" \
  -f "required_status_checks[contexts][]=Unit tests" \
  -f "required_status_checks[contexts][]=Build" \
  -f "required_status_checks[contexts][]=E2E smoke (Playwright)" \
  -f "enforce_admins=false" \
  -f "required_pull_request_reviews[required_approving_review_count]=0" \
  -f "restrictions=" \
  -f "allow_force_pushes=false" \
  -f "allow_deletions=false"
```

Replace `<owner>/<repo>`. `required_pull_request_reviews` must still be an
object, hence the `required_approving_review_count=0` placeholder.

## Verification

1. Open any PR to `main`. The 5 checks above should appear in the merge box.
2. Try to merge while one is failing — GitHub must block the button.
3. Push a direct commit to `main` (on a throwaway branch you can delete) — it
   should be rejected by the ruleset.
