# TODO — Out of scope this week

Items surfaced during the 5-improvement sprint that we deliberately did NOT touch. Pick up in a later iteration.

## 🚨 DEUDA CRÍTICA — RECONCILIAR MIGRACIONES

Producción tiene 38 tablas pero solo 29 tienen `CREATE TABLE` en `supabase/migrations/`. Las 9 huérfanas son:

- ab_assignments
- ab_experiments
- ambient_cards
- aws_service_name_map
- concept_confusion_pairs
- concept_exposures
- coverage_matrix
- elaboration_prompts
- learning_phase_transitions

Estas tablas existen en prod (con datos, posiblemente con RLS policies) pero su DDL no está versionado. Riesgo: cualquier rebuild de staging desde cero las pierde.

**Plan de reconciliación (próxima sesión dedicada):**

1. `pg_dump` de schema de prod (`--schema-only --no-owner`).
2. Identificar DDL de las 9 tablas + sus indexes + RLS policies.
3. Crear migración `060_reconcile_orphaned_schemas.sql` con `CREATE TABLE IF NOT EXISTS` para cada una.
4. Verificar con `supabase db diff` que el diff entre prod y repo es vacío.
5. Investigar origen: ¿rama no mergeada (`claude/nifty-hugle-8b8fb4` "Gemelo Digital learning engine" parece relevante)? ¿Scripts ad-hoc?

**Hasta que esto se resuelva: NO tocar schema de prod manualmente.** Cualquier nueva tabla DEBE ser vía migración versionada.

**STATUS (2026-05-05): Reconciliación BLOQUEADA hasta upgrade a Supabase Pro.** Razón: plan gratis no incluye Point-in-Time Recovery, requisito imprescindible para tocar schema de producción con seguridad.

Hallazgos confirmados durante investigación:
- Las 9 tablas huérfanas no se usan en código de aplicación (cero referencias en `lib/`, `app/`, `types/`, `components/`).
- No hay vectores activos de introducción de schema no versionado (endpoints tipo `apply-migration-XXX` no existen).
- La rama `claude/nifty-hugle-8b8fb4` ya estaba mergeada — no hay diseño original recuperable.
- El plan original (cherry-pick) queda descartado; cuando se desbloquee, será reconstrucción desde `pg_dump` de prod.

Pre-requisito para reanudar: Supabase Pro activo + backup manual reciente verificado restorable.

## Sidebar — hardcoded values

**Resolved (2026-05-06):** the literal `68%` progress bar in
`components/v2/dashboard/Sidebar.tsx` was removed entirely. Product
decision: do not connect it to any metric — would have been decoration
disguised as information.

**Pending:** connect "Exam in X days" to `profiles.exam_target_date`.
Field exists in DB (`supabase/migrations/002_base_schema.sql:15`) but
is not selected by the dashboard layout, not passed through `Shell`,
and not received by `Sidebar`. Plumbing required:

1. Add `exam_target_date` to the profile select in
   `app/(dashboard)/layout.tsx`.
2. Add `examTargetDate` prop to `components/v2/dashboard/Shell.tsx`
   and forward to `Sidebar`.
3. In `Sidebar`, compute `differenceInDays(exam_target_date, now)`
   and render conditionally (skip if user has no target date set).

Not a 1-2-line change — left as separate work.

## `hasCalibration` semantic confusion
- Two endpoints write `profiles.cognitive_fingerprint` with different semantics:
  - `/api/onboarding/calibrate` (mandatory onboarding) — writes `calibrated_at`, `background`, `self_level_by_domain`. Does NOT set `v2_initialized_at`.
  - `/api/learn/calibration` (optional, post-onboarding) — sets `v2_initialized_at` plus working memory/processing speed/chronotype data.
- Variable named `hasCalibration` in [app/(dashboard)/dashboard/page.tsx:142](app/(dashboard)/dashboard/page.tsx:142) checks specifically for `v2_initialized_at`, so it really means "completed v2 cognitive quiz", not "completed onboarding".
- Possible source of future confusion. Consider renaming `hasCalibration` → `hasV2Calibration` or `hasCognitiveProfile` in next iteration.

## Test fixture states
- The existing `/api/test/login` fixture endpoint creates a single persistent user with `onboarding_completed=true`. Useful for happy-path E2E but doesn't cover state-specific dashboards (no_sessions, has_sessions, pre_exam, post_cert, etc.).
- When recurring user testing of state-dependent UI becomes a need: `scripts/seed-test-states.ts` to spin up fixture users in specific states (truncate `study_sessions`, set `exam_target_date`, etc.).

## i18n missing for new strings
- Mejora 1 introduces new user-facing strings as inline literals in [app/(dashboard)/dashboard/page.tsx](app/(dashboard)/dashboard/page.tsx) (Zone A and Zone C). Repo has no i18n system today.
- If/when an i18n system is introduced (next-intl / react-intl / etc.), extract these strings.

## TZ edge case in journey phase boundaries
- `computeJourneyPhase` normalizes both sides to UTC midnight (matches the SQL `date - date` semantics, since `profiles.exam_target_date` is a DATE column).
- Edge case: a user in CET with `exam_target_date = today` can see `daysToExam = -1` (UTC) while their wall clock still says today. Doesn't affect Mejora 1 (pre_study vs active_prep — neither depends on the boundary), but matters for the `pre_exam` (`<= 14`) and `post_cert` (`>= 0`) thresholds in future iterations.
- Fix when needed: read user's TZ from profile (no field today — would need to add) or use `Intl.DateTimeFormat().resolvedOptions().timeZone` server-side via `headers().get('x-vercel-ip-timezone')`.

## journey_phase persistence
- Migration 014 defines `compute_journey_phase(uuid)` and a `profiles.journey_phase` column with `default 'pre_study'`, but **nothing recomputes or persists the value**.
  - No SQL triggers call `compute_journey_phase`.
  - No cron in `vercel.json` recomputes it (`snapshot-readiness` only touches readiness columns).
  - Only writer in app code is `app/api/profile/exam-outcome/route.ts:32` setting `'post_cert'` manually after exam outcome capture.
  - Comment in that file ("journey_phase derivation runs on next read via compute_journey_phase") is incorrect — Postgres functions don't auto-run on read.
- Result: every user who hasn't reported an exam outcome is stuck at `'pre_study'` regardless of their real state.
- Mejora 1 works around this by computing phase in runtime (TS port of the SQL logic) — does NOT fix persistence.
- Future fix options:
  - Trigger on `study_sessions` insert/update + on `profiles.exam_target_date` update that recomputes & writes `journey_phase`.
  - Or: nightly cron that calls a `recompute_journey_phase_batch()` SQL function.
  - Or: drop the column and always derive (simpler, fewer drift bugs — but loses `where journey_phase = 'pre_exam'` queries for batch ops like targeted emails).

## PR 2.A surfaced — to address later

### Build prerender fails without Supabase env vars

In any environment without `.env.local`, `next build` succeeds at compile/lint
but collapses during static prerender on 15 routes that touch Supabase. Build
only "passes" in CI/Vercel where env vars exist. Affected routes (from build
output during PR 2.A):

- `/(dashboard)/documents/page` → `/documents`
- `/(dashboard)/exam/page` → `/exam`
- `/(dashboard)/flashcards/page` → `/flashcards`
- `/(dashboard)/learn/[domainSlug]/page` → cost-optimized-architecture, performant-architecture, resilient-architecture, secure-architecture
- `/(dashboard)/learn/calibration/page`
- `/(dashboard)/learn/exam-guide/page`
- `/(dashboard)/learn/page`
- `/(dashboard)/learn/session/page`
- `/api/documents/route`
- `/api/learn/next-activity/route`
- `/api/learn/state/route`
- `/api/notifications/route`

Fix candidates: add `export const dynamic = 'force-dynamic'` to those routes,
or make Supabase guards (`lib/supabase/middleware.ts`, admin client) early-
return a stub during build instead of throwing.

Practical impact: blocks any fresh-clone setup including future agents
working in clean worktrees, as observed in PR 2.A.

### Orphaned `ToastMessage` interface

[types/index.ts:35-41](types/index.ts) declares a `ToastMessage` interface
with zero consumers (predates the sonner-based toast system added in PR 2.A).
Either delete or have the new sonner wrapper consume it. Cleanup candidate
when PR 2.B introduces the first real toast caller.

### No tests for `getEntitlement` / `overCap`

[lib/subscription/check.ts](lib/subscription/check.ts) drives the entire
paywall (4 entitlement kinds with sub-branches per `reason`) and has zero
unit coverage. Surfaced during PR 2 discovery; deliberately not addressed
in PR 2.A (scope was infra + tracking).

Add `tests/unit/subscription/check.test.ts` covering at minimum:

- `trialing` (Stripe sub `status='trialing'`)
- `active` (Stripe sub `status='active'`)
- `exploring` under cap on all dimensions
- `exploring` with overCap on `questions` only (`questions=20/20`, others under)
- `exploring` with overCap on `ambient` only (`ambient=10/10`, others under)
- `exploring` with overCap on `anchoring` only (`anchoring=1/1`, others under)
- `gated` reason `past_due`
- `gated` reason `canceled` + overCap
- `gated` reason `preview_exhausted`

The three single-dimension overCap cases are the ones PR 2.B will rely on
(threshold-driven toasts per dimension), so coverage there is load-bearing.
