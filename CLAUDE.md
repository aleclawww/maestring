# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Maestring?

SaaS platform for AWS certification preparation (currently AWS SAA-C03). Core differentiator: AI-adaptive question generation + FSRS-based spaced repetition, not a static question bank.

Stack: Next.js 14 (App Router) · TypeScript strict · Supabase (Postgres + pgvector + Auth) · ts-fsrs (FSRS-4.5) · Claude Haiku · OpenAI embeddings · Stripe · Resend · Upstash Redis.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint (`eslint-config-next`) |
| `npm run seed` | Seed AWS SAA knowledge graph (certifications → domains → topics → concepts) |
| `npm run reset-dev` | Wipe dev data, keep schema |
| `npm run db:start` / `db:stop` | Boot/stop local Supabase stack |
| `npm run db:push` | Apply migrations from `supabase/migrations/` |
| `npm run db:reset` | Drop + recreate local DB and re-apply all migrations |
| `npm run db:types` | Regenerate `types/supabase-generated.ts` |
| `npm run setup` | One-shot: install + db start + push + types + seed |

There is no test runner wired up yet (Playwright + unit tests are pending TODOs).

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

## Notes for future Claude sessions

- `CONSOLIDATION_NOTES.md` documents that this workspace was reconstructed from prior sandboxed sessions; some modules (notably `question-engine/`) may exist as skeletons. Verify a file's actual contents before assuming functionality.
- Cron RPCs (`get_users_needing_nudge`, `get_broken_streaks_today`) live in migration 011. They return `streak_days` aliased from `profiles.current_streak` and `first_name` from `split_part(full_name, ' ', 1)` — the cron route handlers expect those exact field names.
- Open TODOs: unit tests for `question-engine/selector` and `lib/fsrs`; Playwright E2E for the study session flow; first-run onboarding gate (exam date, daily goal) before `(dashboard)` is reachable.
