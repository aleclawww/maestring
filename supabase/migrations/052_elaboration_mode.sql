-- 052_elaboration_mode.sql
-- Elaboration Mode — the post-CORRECT twin of the existing post-INCORRECT
-- micro-elaboration that already lives in AnswerFeedback.tsx:250-274.
--
-- Pedagogy (gobierna cada decisión aquí):
--   * Bjork's desirable difficulty: the effort of generating an explanation
--     IS the learning, not a bug to remove.
--   * Karpicke's elaborative retrieval: the value is in the user's ATTEMPT
--     to articulate, not in whether it's correct nor in who grades it. That
--     is why this feature carries ZERO LLM calls — the learning happens
--     when the user writes, before they ever see the model explanation.
--   * The model explanation MUST stay hidden until after submit. The user
--     writes, then sees both side-by-side and self-assesses against a small
--     pre-written checklist of "what a good answer covers". Honor system.
--
-- Two tables:
--   1. concept_elaborations — 1:1 with concepts, holds the pre-written
--      content (model explanation, key-points checklist, optional
--      metacognitive prompt). Mirrors the concept_briefs pattern from
--      migration 051: PK = concept_id, RLS select-only for authenticated,
--      no insert/update/delete policies (admin writes via service_role).
--   2. elaboration_attempts — append-only record of each elaboration a user
--      writes. Mirrors the question_attempts pattern from migration 005:
--      INSERT + SELECT only (immutable), per-user RLS.
--
-- Idempotency: CREATE TABLE / INDEX use `if (not) exists`. Triggers guarded
-- by `drop trigger if exists` per the migration 048/051 convention. RLS
-- policies have no guard (matches migrations 003/044/050/051). Re-running
-- end-to-end requires `npm run db:reset`.

-- ── 1. concept_elaborations (pre-written content) ─────────────────────────

create table if not exists public.concept_elaborations (
  concept_id              uuid primary key references public.concepts(id) on delete cascade,
  model_explanation_md    text not null,
  key_points              jsonb not null,
  metacognitive_prompt    text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  -- Body length: 50 chars guards against empty/placeholder content; 4000
  -- caps it at roughly 600-700 words so the side-by-side comparison stays
  -- readable on a phone screen. Concept briefs (051) cap at 10000 — the
  -- elaboration is intentionally tighter because it's read AFTER the user
  -- has already written their own; signal density matters more than depth.
  constraint cel_model_length_chk
    check (length(model_explanation_md) between 50 and 4000),

  -- key_points is a jsonb ARRAY of short strings. 2-6 items: less than 2 is
  -- not a meaningful checklist; more than 6 turns the self-assessment into
  -- a chore. Element-level "must be string" validation lives in Zod at the
  -- /api/admin route (when we build the admin UI) and in the seed script,
  -- because Postgres CHECK constraints cannot contain subqueries (0A000:
  -- "cannot use subquery in check constraint"). Same trade-off as
  -- concept_briefs.gotchas — application-layer validates elements, DB
  -- enforces shape.
  constraint cel_key_points_shape_chk
    check (jsonb_typeof(key_points) = 'array'
           and jsonb_array_length(key_points) between 2 and 6),

  -- Optional metacognitive prompt: a single sentence shown after submit as
  -- a "para pensar (no requires respuesta): …" seed. 10-500 char range
  -- forces it to be a real question, not "ok" or a paragraph.
  constraint cel_meta_length_chk
    check (metacognitive_prompt is null
           or length(metacognitive_prompt) between 10 and 500)
);

comment on table public.concept_elaborations is
  'Pre-written elaboration content shown POST-CORRECT in the study loop: model explanation (revealed only after user submits their own), checklist of key points for self-assessment, optional metacognitive prompt. Zero LLM calls in the runtime path — all content is human-curated. 1:1 with concepts via concept_id PK. Mirrors the concept_briefs pattern from migration 051. The twin of the post-INCORRECT elaboration that lives in AnswerFeedback.tsx (which DOES use Haiku); these two are distinct cognitive moments and remain technically separate, but share visual + voice coherence.';
comment on column public.concept_elaborations.model_explanation_md is
  'Markdown body of the model explanation — what a good answer covers, written by an AWS-certified author. Shown ONLY after the user submits their own attempt. Side-by-side comparison with the user''s text is the entire point.';
comment on column public.concept_elaborations.key_points is
  'jsonb array of 2-6 short strings, each one a "point a good explanation covers" for the checklist self-assessment. Element-level validation (each element must be string, sensible length) lives at the application layer (Zod in the seed script / future admin route).';
comment on column public.concept_elaborations.metacognitive_prompt is
  'Optional seed prompt shown after submit. Not required to answer — pure cognitive nudge. e.g. "¿En qué escenario real lo aplicarías?" or "¿Qué pasa si quitas X de la arquitectura?". Keeps the user thinking after the explicit task is done.';

-- ── 2. RLS for concept_elaborations ───────────────────────────────────────
-- Open SELECT for any authenticated user (the elaboration panel needs to
-- read the content after the user submits). INSERT/UPDATE/DELETE have no
-- policies → RLS denies by default. service_role (admin client) bypasses.

alter table public.concept_elaborations enable row level security;

create policy "concept_elaborations_select_authenticated" on public.concept_elaborations
  for select to authenticated using (true);

-- ── 3. updated_at trigger ─────────────────────────────────────────────────

drop trigger if exists concept_elaborations_updated_at on public.concept_elaborations;
create trigger concept_elaborations_updated_at before update on public.concept_elaborations
  for each row execute procedure update_updated_at();

-- ── 4. elaboration_attempts (user-written history) ───────────────────────
-- Append-only record. Each row is one elaboration a user wrote for one
-- question. Mirrors the question_attempts pattern from migration 005:
-- INSERT + SELECT only (no UPDATE, no DELETE), per-user RLS via auth.uid().

create table if not exists public.elaboration_attempts (
  id                       uuid primary key default uuid_generate_v4(),
  created_at               timestamptz not null default now(),
  session_id               uuid not null references public.study_sessions(id) on delete cascade,
  question_id              uuid not null references public.questions(id) on delete cascade,
  concept_id               uuid not null references public.concepts(id) on delete cascade,
  user_id                  uuid not null references auth.users(id) on delete cascade,

  -- The user's own explanation. Stored RAW (not hashed, not redacted).
  -- This is potentially the most valuable signal Maestring will ever
  -- generate: it is literally how each user articulates each AWS concept
  -- in their own words. Future uses (NOT for v1, but kept open):
  --   * Aggregated + anonymized analysis to detect common misconceptions
  --     across the population ("70% of users explaining S3 storage classes
  --     conflate Standard-IA with Glacier IR").
  --   * Training signal for the "cognitive twin" / cognitive_fingerprint
  --     vision — per-user articulation patterns are a richer signal than
  --     accuracy alone.
  --   * Material for human authors to refine model_explanation_md based
  --     on the user-side gaps that show up repeatedly.
  -- v1 keeps this table strictly per-user via RLS (the user can only read
  -- their own). Any future aggregation MUST go through service_role with
  -- explicit anonymization at the query layer, not via a new RLS policy.
  -- DO NOT add a "purge on user delete" routine that drops these rows —
  -- the auth.users FK ON DELETE CASCADE already wipes them when the user
  -- account is deleted, which is the correct behavior. Do NOT pre-emptively
  -- truncate / sanitize the text "to be safe"; the value is in the text.
  user_explanation         text not null,

  -- Indices of key_points the user marked as "I covered this" during the
  -- self-assessment step. jsonb array of integers (e.g. [0, 2, 3]).
  -- Validated for SHAPE here; the user could in theory mark non-existent
  -- indices — that's fine for analytics, the comparison reveals it.
  covered_point_indices    jsonb not null default '[]',

  -- Did the user write anything in response to the metacognitive prompt?
  -- Boolean only — the prompt explicitly says "no requiere respuesta", we
  -- just track whether they engaged. We do NOT persist the metacognitive
  -- response text (yet): it's a free-form private thought, not training
  -- material. If we ever want to use it, ship that as a follow-up.
  metacognitive_responded  boolean not null default false,

  constraint elab_text_length_chk
    check (length(btrim(user_explanation)) between 1 and 4000),
  constraint elab_covered_shape_chk
    check (jsonb_typeof(covered_point_indices) = 'array')
);

comment on table public.elaboration_attempts is
  'Append-only history of post-correct elaborations a user has written. INSERT + SELECT only per RLS; mirrors the question_attempts immutability pattern from migration 005. Each row carries the user''s raw written text and which key-points checklist items they self-assessed as covered. Drives the "% of sessions with ≥1 elaboration" product metric and is the future source for aggregated misconception analysis (see column comment on user_explanation).';

-- Per-user lookup for the "% sessions with ≥1 elaboration" metric — the
-- query is `count(distinct session_id) where user_id = X group by week`.
-- A composite (user_id, session_id) covers that index access path without
-- needing a separate (user_id) index, since RLS already filters by user.
create index if not exists elaboration_attempts_user_session_idx
  on public.elaboration_attempts (user_id, session_id);

-- Per-concept aggregation for "which concepts get elaborated most" and
-- future misconception clustering across users. Goes through service_role
-- so doesn't need to be RLS-aware.
create index if not exists elaboration_attempts_concept_idx
  on public.elaboration_attempts (concept_id, created_at desc);

-- ── 5. RLS for elaboration_attempts ──────────────────────────────────────

alter table public.elaboration_attempts enable row level security;

-- INSERT + SELECT only, scoped to the user's own rows. No UPDATE / DELETE
-- policies → those operations are denied by default. The 1:1 with the
-- user's auth identity is enforced by `auth.uid() = user_id` matching the
-- service_role only path through createAdminClient if we ever need a
-- backfill / admin tool.

create policy "elaboration_attempts_insert_own" on public.elaboration_attempts
  for insert to authenticated with check (auth.uid() = user_id);

create policy "elaboration_attempts_select_own" on public.elaboration_attempts
  for select to authenticated using (auth.uid() = user_id);
