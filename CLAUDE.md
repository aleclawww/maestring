# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Maestring?

SaaS platform for AWS certification preparation (currently AWS SAA-C03). Core differentiator: AI-adaptive question generation + FSRS-based spaced repetition, not a static question bank.

Stack: Next.js 14 (App Router) · TypeScript strict · Supabase (Postgres + pgvector + Auth) · ts-fsrs (FSRS-4.5) · Claude Haiku · OpenAI embeddings · Lemon Squeezy (Merchant of Record) · Resend · Upstash Redis.

## Current status (2026-05-05)

**Soft launch with SAA-C03 only.** The marketing site, dashboard, and study loop are live in production at maestring.com with the new "Corporate Trust" v2 design system (indigo→violet gradient, Plus Jakarta Sans, slate-50 surfaces, scoped under `.theme-v2`). The other 5 AWS certs (DVA-C02, SOA-C02, SAP-C02, MLA-C01, ANS-C01) render as faded "Coming soon" cards in the CertGrid with a mailto-notify fallback — no `/signup` link.

**Pricing structure:**
- Lifetime SAA-C03 — $119 once
- Pro — $29/mo with 7-day free trial (card on file required), unlocks every future cert as we ship them
- Teams — custom (mailto:hello@maestring.com)

Payments via **Lemon Squeezy** (migrated from Stripe in commits 30cfaa6 / 32320cc). Frontend uses `<UpgradeButton>` from `components/billing/`. Migration 049 holds the LS subscription schema.

**Known CI gap:** `DB tests (pgTAP)` is currently red on `main` due to pre-existing bugs in migrations 040 (return-type change without DROP) and 042 (referenced non-existent `certification_id`/`job_name` columns + `CREATE INDEX CONCURRENTLY` inside a tx). The fixes for those landed in PR #72 along with the v2 redesign. Worth verifying the next push is green before assuming pgTAP is healthy.

**Most recent PR:** [#72](https://github.com/aleclawww/maestring/pull/72) (squash-merged as `65941cb`) — Corporate Trust redesign + SAA-C03 soft-launch copy + the three pgTAP migration fixes.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint (`eslint-config-next`) |
| `npm run test` | Vitest unit suite (`tests/unit/**/*.test.ts`) |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Vitest + v8 coverage |
| `npm run test:e2e` | Playwright (`tests/e2e/**/*.spec.ts`) |
| `npm run seed` | Seed AWS SAA knowledge graph (certifications → domains → topics → concepts) |
| `npm run reset-dev` | Wipe dev data, keep schema |
| `npm run db:start` / `db:stop` | Boot/stop local Supabase stack |
| `npm run db:push` | Apply migrations from `supabase/migrations/` |
| `npm run db:reset` | Drop + recreate local DB and re-apply all migrations |
| `npm run db:types` | Regenerate `types/supabase-generated.ts` |
| `npm run setup` | One-shot: install + db start + push + types + seed |

Unit tests live under `tests/unit/` (vitest, node env). E2E specs live under `tests/e2e/` (Playwright). The `e2e-smoke` CI job is gated on repo var `E2E_ENABLED=true` — flip it once a staging Supabase is wired up (see `.github/workflows/ci.yml`).

## Local setup

1. `npm install`
2. `cp .env.example .env.local` and fill in: `SUPABASE_*`, `STRIPE_*`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `UPSTASH_REDIS_REST_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`, `MAGIC_LINK_SECRET`.
3. `npx supabase start && npx supabase db push`
4. `npx supabase gen types typescript --local > types/supabase-generated.ts`
5. `npm run seed && npm run dev`

## Architecture

```
/app
  (marketing)/          public landing + pricing
  (auth)/login|signup   magic link + Google OAuth
  auth/callback/        Supabase OAuth callback
  (dashboard)/          authenticated app — includes /dashboard and /study
  api/                  route handlers (study, webhooks, cron, documents)
/lib
  supabase/             client, server, admin, middleware
  fsrs/                 ts-fsrs wrappers (FSRS-4.5)
  question-engine/      prompts, generator, selector
  knowledge-graph/      aws-saa.ts (DOMAINS, TOPICS, ~43 CONCEPTS)
  ingestion/            pdf-extractor, chunker, embeddings, pipeline
  stripe/               checkout, portal, webhooks
  redis/                rate-limit (fail-open), cache
  email/ resend/        sendEmail + React Email templates
  openai/ pdf/          embeddings + PDF parsing
  magic-links.ts        JOSE JWT with JTI dedup
  auth/ utils/ logger.ts pino-based logging
/supabase/migrations/   001_extensions → 014_journey_phase — canonical schema source of truth (Supabase CLI reads here)
                        012_readiness_score: get_exam_readiness() (Pilar 1)
                        013_cognitive_fingerprint: profiles.cognitive_fingerprint + study_mode 'exploration' (Pilares 2/3)
                        014_journey_phase: journey_phase enum + snapshot_readiness() (Pilar 5)
/question-engine/       legacy/standalone selector + Zod schemas (see CONSOLIDATION_NOTES.md)
/types                  database.ts, study.ts, supabase-generated.ts
```

The dashboard, study UI, and all API routes assume an authenticated Supabase user resolved through `lib/supabase/middleware.ts` (wired via root `middleware.ts`).

The study loop: `(dashboard)/study/page.tsx` → `POST /api/study/generate` (selector picks due concept from `user_concept_states` via FSRS, generator calls Haiku) → user answers → `POST /api/study/evaluate` (Haiku grades, FSRS schedules next review, `question_attempts` row inserted, `user_concept_states` updated). Embeddings (OpenAI `text-embedding-3-small`, 1536 dims, HNSW `m=16, ef=64`) power retrieval over ingested PDFs.

`study_sessions` carries legacy (`is_completed`, `completed_at`, `abandoned_at`, `concepts_studied`, ...) and extension (`status`, `domain_id`, `questions_answered`, `started_at`, `ended_at`, ...) columns; the `sync_study_session_status` trigger (migration 010) keeps both sides coherent. `bump_user_streak` updates `profiles.current_streak` when a session flips to `status='completed'`.

Migrations live in `supabase/migrations/` (the Supabase CLI default). The earlier `database/migrations/` was a stale duplicate and was removed. `concepts.certification_id` is a TEXT identifier (`aws-saa-c03`), not a FK to a separate certifications table. The topics table is `domain_topics` (not `knowledge_topics`).

## Key technical decisions

| Area | Choice | Why |
|---|---|---|
| Spaced repetition | `ts-fsrs` v4 (FSRS-4.5) | State-of-the-art SR algorithm |
| Question gen model | `claude-haiku-4-5-20251001` | Cost/latency for high-volume generation |
| Embeddings | `text-embedding-3-small` (1536 dims) | Cost/quality balance |
| Vector index | pgvector HNSW (`m=16, ef=64`) | Better recall than IVFFlat |
| Rate limiting | Upstash Redis sliding window, **fail-open** | Avoid blocking users on Redis outage |

## Common patterns

```typescript
// Server component / route handler auth gate
const user = await requireAuthenticatedUser(); // redirects if unauthenticated

// LLM rate limit (fail-open: rl.allowed === true on Redis error)
const rl = await checkLlmRateLimit(user.id);
if (!rl.allowed) return NextResponse.json({ error: "Rate limited" }, { status: 429 });
```

Cron endpoints under `app/api/cron/*` are guarded by the `CRON_SECRET` header and invoked from `vercel.json`.

`GET /api/health` is a public liveness probe — pings Supabase + Redis with a 3s timeout each, returns JSON + 200/503. Listed in `PUBLIC_PREFIXES` in `middleware.ts` so uptime monitors (BetterUptime/UptimeRobot/Vercel) don't get 307'd to `/login`.

## UX decisions

### Mejora 1 — Adaptive cold-start dashboard (2026-05-05)
- Computamos journey phase en runtime ([lib/journey/compute.ts](lib/journey/compute.ts)) en lugar de leer `profiles.journey_phase` porque el campo está stale: nada en el código recomputa o persiste el valor (ver [TODO.md](TODO.md)).
- Dashboard se adapta a `hasCompletedSession` para no mostrar métricas en cero a usuarios pre-primera-sesión. Cambios quirúrgicos solo en Zona A (card "Today's session") y Zona C (subhead del greeting). Zonas B (Readiness fallback) y D ("What's next" vía `hasCalibration`) ya tenían adaptación propia.
- `hasCompletedSession` se deriva de `(recentSessions?.length ?? 0) > 0` — la query existente ya filtra `is_completed=true`. Sin queries nuevas. Caveat: `recentSessions.limit(3)` significa que `length` no es un conteo real, solo un proxy de "alguna existe".
- Feature flag: `FF_ADAPTIVE_DASHBOARD` (server-only, [lib/featureFlags.ts](lib/featureFlags.ts)). Default OFF. Supports per-user allowlist via `FF_ADAPTIVE_DASHBOARD_USERS` (comma-separated user IDs) for gradual rollout / dogfooding before global enable.
- Métrica esperada: reducción de bounce rate del primer día. Telemetría de CTAs queda fuera de scope (Mejora 6).
- Nota lingüística: durante el desarrollo se planearon las strings en español, pero el merge final dejó todas las strings nuevas en **inglés** para consistencia con el resto del dashboard. Si lees el historial de la branch (`claude/hopeful-hertz-a98813`) verás un commit "translate Mejora 1 adaptive copy to English for consistency" que materializó esa decisión.
- **Status: Shipped to production globally on 2026-05-05.** Validated manually with test user (cases a, b) and primary account (case d). pgTAP CI failure investigated and confirmed orthogonal — orphaned index removed in separate commit (`0b1d4f2`), deeper migrations debt documented in [TODO.md](TODO.md) as critical (9 tables in prod with no `CREATE TABLE` in repo).

## Notes for future Claude sessions

- `CONSOLIDATION_NOTES.md` documents that this workspace was reconstructed from prior sandboxed sessions; some modules (notably `question-engine/`) may exist as skeletons. Verify a file's actual contents before assuming functionality.
- Cron RPCs (`get_users_needing_nudge`, `get_broken_streaks_today`) live in migration 011. They return `streak_days` aliased from `profiles.current_streak` and `first_name` from `split_part(full_name, ' ', 1)` — the cron route handlers expect those exact field names.
- The first-run onboarding gate is live in `middleware.ts` — redirects to `/onboarding` if `user_metadata.onboarding_completed !== true`, returning JSON 403 for `/api/*` callers so fetch-based flows don't silently follow a 307 into HTML.

# Maestring — Phase 1: Question Quality Validation

## Contexto del proyecto

Maestring es un SaaS de preparación para certificaciones AWS, actualmente en soft launch con SAA-C03. Stack: Next.js 14 (App Router), TypeScript, Supabase (Postgres + pgvector + Auth), ts-fsrs (FSRS-4.5), Claude Haiku para generación/evaluación, OpenAI embeddings, Lemon Squeezy, Resend, Upstash Redis.

**Modelo de aprendizaje:** las preguntas se sirven al usuario desde dos fuentes:
1. Pool pre-generado (~2000 preguntas exam-pattern), validado a mano en su día.
2. Static-generator determinista (`lib/question-engine/static-generator.ts`) cuando el pool no tiene candidato para el concepto due. Sin LLM en runtime.

El selector actual (en `app/api/study/generate/route.ts`) usa FSRS para decidir el siguiente concepto due, y luego decide si servir del pool o caer al static-generator.

## Objetivo de esta fase

Asegurar que las preguntas que ven los usuarios son de calidad fiable. Tres sub-objetivos:

1. **Pool curado como fuente primaria por defecto.** La generación en vivo pasa a ser fallback, no default.
2. **Mecanismo de reporte de preguntas** desde la UI, con vista admin para revisar.
3. **Pipeline de doble validación con Sonnet** para preguntas generadas por Haiku antes de que entren al pool servible.

## Out of scope en esta fase

- No tocar la lógica de FSRS ni `user_concept_states`.
- No tocar la UI del Knowledge Map ni de Coach.
- No añadir Concept Briefs (eso es Fase 2).
- No cambiar pricing ni el dashboard general.

## Schema (current)

Existente en `questions` (migraciones 003 → 049, los campos rich vienen de 017 / 018 / 036):

```
id uuid pk
created_at timestamptz
concept_id uuid fk → concepts(id)
question_text text
options jsonb              -- array de 4 strings
correct_index int          -- 0..3
explanation text
difficulty float           -- 0..1
question_type question_type
source text                -- 'curated' | 'static' | 'ai-generated' (default)
is_active boolean
times_shown int
times_correct int
review_status question_review_status   -- 'pending' | 'approved' | 'rejected' | 'needs_review' (default 'approved')
is_canonical boolean
pattern_tag text
blueprint_task_id text
hint text
explanation_deep text
key_insight text
scenario_context text
tags text[]
```

Otras tablas relevantes existentes: `question_attempts (question_id, user_id, session_id, is_correct, time_seconds, ...)`, `concepts (id, domain_id, slug, name, ...)`, `profiles`.

A añadir en migración `050`:

- Columnas nullable en `questions`: `validation_notes text`, `validated_at timestamptz`, `validator_model text`.
- Tabla `question_reports`:
  ```
  id uuid pk
  created_at timestamptz
  question_id uuid fk → questions(id) on delete cascade
  user_id uuid fk → auth.users(id) on delete cascade
  category text                         -- 'wrong_answer' | 'multiple_correct' | 'unclear' | 'outdated' | 'other'
  comment text                          -- nullable, NOT NULL when category = 'other' (Zod side)
  user_selected_option int              -- nullable, 0..3
  status text default 'pending'         -- 'pending' | 'reviewed' | 'dismissed' | 'fixed'
  ```
  Índices por `question_id` y por `status`.
- Drop tabla `question_feedback` (ver "`question_feedback` deprecated").

`question_quality_metrics` queda fuera de Fase 1 — se añadirá si hay volumen que lo justifique.

## Convenciones del proyecto

- Naming: snake_case en DB, camelCase en TS.
- Server Actions en `app/api/*/route.ts` para mutaciones, prefiero RSC + Server Actions sobre client fetch cuando aplique.
- Validación de inputs con Zod.
- Errores: nunca leakear stack traces al cliente. Logging server-side con `lib/logger.ts` (pino).
- LLM calls: helpers en `lib/question-engine/` (Haiku, vía `generator.ts`) y `lib/llm/` (`usage.ts` para tracking; `sonnet.ts` se crea en commit 6).
- Tipos compartidos en `types/` (raíz, no `lib/types/`).

## Archivos clave a tocar (mapa mental)

> Rutas verificadas contra el repo real — ver "Repo paths (corrected)" más abajo.

- `app/api/study/generate/route.ts` — selector actual, hay que reforzar la prioridad pool > static-fallback.
- `app/api/study/evaluate/route.ts` — no tocar lógica, solo posiblemente añadir tracking.
- `app/(dashboard)/study/components/QuestionCard.tsx` — añadir botón "Report".
- `lib/question-engine/generator.ts` — Haiku generator existente (desconectado del runtime, ver nota abajo). Solo se invoca desde el script batch del commit 7.
- `lib/llm/sonnet.ts` — **crear** para validación (no `lib/ai/`, ese directorio no existe en el repo).
- `app/admin/questions/page.tsx` — crear, vista de reportes y pending.
- `supabase/migrations/050_question_quality.sql` — `question_reports` + columnas de validación en `questions` + drop `question_feedback`.

## Repo paths (corrected)

Las rutas asumidas en el spec original no se corresponden con el repo. Las verdaderas son:

- **Sin `lib/ai/`.** El equivalente es `lib/question-engine/` (`generator.ts`, `selector.ts`, `static-generator.ts`, `validator.ts`, `prompts.ts`, `templates.ts`, `question-schema.ts`) más `lib/llm/usage.ts` (helper de tracking de uso). El nuevo helper de Sonnet vive en `lib/llm/sonnet.ts`.
- **Sin `app/(study)/`.** El study UI vive bajo `app/(dashboard)/study/` con `components/QuestionCard.tsx` (no `_components/`).
- **Sin `app/admin/`** todavía — se crea en el commit 8.
- **Migraciones**: la numeración real va `001 … 049`. La siguiente es `050`. La columna `questions.review_status` ya existe desde la migración `029` (enum extendido en `037` con `needs_review`), y el selector ya filtra `review_status = 'approved'`.

### Haiku desconectado del runtime

`lib/question-engine/generator.ts` implementa generación de preguntas con Claude Haiku, pero **NO está enchufado** al selector de runtime (`app/api/study/generate/route.ts` solo hace pool-first → `static-generator`). La Fase 1 deja esto así intencionadamente. El Haiku generator solo se invoca desde el script batch del commit 7 (`scripts/generate-questions-batch.ts`), que produce preguntas offline y las inserta con `review_status='pending'` para que el pipeline Sonnet las valide antes de pasar a `approved`.

### `question_feedback` deprecated

Tabla creada en `003_knowledge_schema.sql` (categorías `wrong_answer | unclear | outdated | good`) y nunca usada en código (cero referencias en `app/` y `lib/`). Se dropea en la migración `050`, superseded by `question_reports`.

## Phase 1 design decisions

- **A. Reusar `questions.review_status`, NO crear `pending_questions`.** La columna ya existe y el selector ya la filtra. Añadimos solo `validation_notes text`, `validated_at timestamptz`, `validator_model text` como columnas nullable en `questions`. Una segunda tabla solo añadiría duplicación y un paso de "mover filas" sin ganancia.
- **B. `question_reports` nuevo + drop `question_feedback`.** La tabla vieja lleva muerta desde la migración 003 sin un solo `select`/`insert` en código. Se reemplaza limpio en la misma migración 050.
- **C. C2 — pipeline Sonnet solo para batch offline, NO Haiku live.** El producto hoy sirve pool o static-gen; activar Haiku live ahora expandiría alcance en una fase cuyo objetivo es reducir riesgo. La validación con Sonnet vive en un script CLI (`scripts/generate-questions-batch.ts`), no en una ruta cron. Si en el futuro los datos justifican Haiku live, eso es Fase 1.5.
- **D. 5 categorías de report** (no 7): `wrong_answer`, `multiple_correct`, `unclear` (absorbe ambiguous + poorly_worded + typo), `outdated`, `other`. La categoría `other` exige `comment` no vacío (validación Zod). `question_reports` también captura `user_selected_option int nullable` con la opción que el usuario había marcado al reportar — contexto valioso para revisar.
- **E. Admin gate por allowlist de email.** Variable de entorno `ADMIN_EMAILS` (coma-separada). Helper `isAdmin(user)` en `lib/auth/admin.ts`. La ruta `/admin/questions` redirige a `/dashboard` si false; los endpoints `POST /api/admin/*` validan con el mismo helper. Sin sistema de roles — eso se construye cuando haya volumen para justificarlo.

## Política de feature flags

Usar variable de entorno `FF_QUESTION_QUALITY_V2` para poder desactivar el nuevo selector si algo falla en producción. Default `false` hasta que esté testeado.

## Criterios de aceptación de la fase

- [ ] Migraciones SQL aplicadas en dev y staging.
- [ ] Selector sirve del pool curado por defecto, fallback a static-generator solo si pool agotado para ese concepto y usuario (Haiku live queda fuera, ver decisión C).
- [ ] Botón "Report" funcional en `QuestionCard`, modal con las 5 categorías de la decisión D, inserción correcta en `question_reports` (incluyendo `user_selected_option`).
- [ ] Vista `/admin/questions` con dos tabs: "Reports pending" y "AI questions pending validation". Acciones: aprobar, rechazar, eliminar pregunta del pool. Gateada por allowlist `ADMIN_EMAILS` (decisión E).
- [ ] Pipeline de validación con Sonnet vía script CLI (`scripts/generate-questions-batch.ts`): genera N con Haiku → inserta en `questions` con `review_status='pending'` → valida cada una con Sonnet → marca `approved` o `rejected`.
- [ ] Etiqueta visual "Verified" / "AI-generated (beta)" en `QuestionCard`.
- [ ] Tests: al menos integration tests del nuevo selector y unit tests del validador con Sonnet (mockeable).
- [ ] Feature flag funciona: con flag off, comportamiento idéntico al actual.

## Riesgos a vigilar

- **Pool agotado por usuario:** algunos conceptos tienen pocas preguntas curadas. Si el usuario las agota, el fallback a static-generator debe ser robusto (no romper la sesión).
- **Coste de Sonnet:** la validación es 1 call por pregunta nueva en el batch CLI, nunca en runtime. Monitorizar el gasto del script al ejecutarlo.
- **Latencia:** la validación con Sonnet vive en el script CLI offline (decisión C), nunca en el path del usuario.
- **Reportes spam:** rate-limit a 5 reportes/usuario/hora con Upstash.

## Pre-merge checklist (phase-1-question-quality)

Before merging this branch to main:
- [ ] `npx supabase db reset --local` aplica todas las migraciones sin error
- [ ] `npx supabase gen types typescript --local > types/supabase-generated.ts` regenera types limpio
- [ ] `types/supabase-generated.ts` ya no contiene `question_feedback` y SÍ contiene `question_reports` + las 3 columnas nuevas en `questions`
- [ ] Si `types/database.ts` es manual, también limpio de `question_feedback`
- [ ] `npm run typecheck` pasa
- [ ] Tests existentes pasan (`npm test` o equivalente)
- [ ] Smoke test manual: flujo de estudio (start session → answer → evaluate) sigue funcionando con `FF_QUESTION_QUALITY_V2=false`
- [ ] Smoke test manual: mismo flujo con `FF_QUESTION_QUALITY_V2=true` (cuando llegue el commit 3)
