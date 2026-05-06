-- 050_question_quality.sql
-- Phase 1 — Question Quality Validation. See CLAUDE.md "Phase 1 design
-- decisions" (A-E) for the rationale behind every choice in this file.
--
-- Three changes:
--   1. Add three nullable columns to `questions` to record the result of
--      the offline Sonnet validation pass run by scripts/generate-questions-batch.ts
--      (commits 6 and 7). They live alongside the human-review columns
--      added in migration 029 (reviewed_at, reviewed_by, reject_reason);
--      validation_* is the automated pass, reviewed_* is the human pass.
--   2. Create `question_reports` so users can flag bad pool questions from
--      the QuestionCard UI (commits 4 and 5). Replaces the unused
--      `question_feedback` table created in migration 003.
--   3. Drop `question_feedback`. Zero references in app/ or lib/, no
--      incoming foreign keys (only an outgoing FK to questions). Forensic
--      check ran before this migration was authored.
--
-- Idempotency follows the repo convention: ADD COLUMN / CREATE TABLE /
-- CREATE INDEX use `if (not) exists`; CREATE POLICY does not (Postgres
-- has no `if not exists` for policies and migrations 003/044 don't guard).
-- Re-running this file end-to-end requires `npm run db:reset`.

-- ── 1. questions: validation columns ─────────────────────────────────────

alter table public.questions
  add column if not exists validation_notes text,
  add column if not exists validated_at     timestamptz,
  add column if not exists validator_model  text;

comment on column public.questions.validation_notes is
  'Free-form notes from the Sonnet validator (Phase 1 commits 6/7). Populated by scripts/generate-questions-batch.ts during the offline validation pipeline. Distinct from reject_reason (added in 029), which is human-authored.';
comment on column public.questions.validated_at is
  'When the Sonnet validator last evaluated this row. Distinct from reviewed_at (also added in 029), which records the human admin decision.';
comment on column public.questions.validator_model is
  'Model id (e.g. claude-sonnet-4-6) that produced validation_notes. Lets us re-run validation with newer models and tell historical passes apart.';

-- ── 2. question_reports ──────────────────────────────────────────────────

create table if not exists public.question_reports (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  question_id          uuid not null references public.questions(id) on delete cascade,
  user_id              uuid not null references auth.users(id)        on delete cascade,
  category             text not null,
  comment              text,
  user_selected_option int,
  status               text not null default 'pending',
  reviewed_at          timestamptz,
  reviewed_by          uuid references auth.users(id) on delete set null,

  constraint question_reports_category_chk
    check (category in ('wrong_answer','multiple_correct','unclear','outdated','other')),
  constraint question_reports_status_chk
    check (status   in ('pending','reviewed','dismissed','fixed')),
  constraint question_reports_option_chk
    check (user_selected_option is null or user_selected_option between 0 and 3),
  constraint question_reports_other_requires_comment_chk
    check (category <> 'other' or (comment is not null and length(btrim(comment)) > 0)),
  constraint question_reports_comment_length_chk
    check (comment is null or length(comment) <= 2000)
);

comment on table public.question_reports is
  'User-submitted reports about pool questions. Status transitions (pending → reviewed/dismissed/fixed) are performed by service_role from the /admin/questions UI; the email allowlist gate (ADMIN_EMAILS) lives at the application layer per Phase 1 decision E.';
comment on column public.question_reports.category is
  'One of five fixed categories: wrong_answer, multiple_correct, unclear (absorbs ambiguous + poorly_worded + typo), outdated, other. Category ''other'' requires a non-empty comment (DB-level CHECK).';
comment on column public.question_reports.user_selected_option is
  'Which option (0..3) the user had selected at the moment of reporting. Nullable because reports may be filed without answering. Captured for admin context.';
comment on column public.question_reports.status is
  'Review lifecycle: pending → reviewed | dismissed | fixed. ''fixed'' means the underlying question was edited or replaced; ''dismissed'' means the report was rejected by the admin.';

alter table public.question_reports enable row level security;

create index if not exists question_reports_question_id_idx
  on public.question_reports (question_id);

-- Partial index supporting the admin view's "list pending reports newest first"
-- query. Mirrors the partial-index style of questions_review_status_idx (029).
create index if not exists question_reports_status_created_idx
  on public.question_reports (status, created_at desc)
  where status = 'pending';

-- Supports both the rate-limit fallback query (Upstash is primary, this is
-- defense-in-depth) and the user-facing "my reports" view.
create index if not exists question_reports_user_id_created_idx
  on public.question_reports (user_id, created_at desc);

-- RLS — option (a) from Phase 1 design discussion: users see/insert their
-- own; admin path uses service_role (createAdminClient) per repo convention.
-- No UPDATE/DELETE policies for authenticated users by design.

create policy "question_reports_insert_own" on public.question_reports
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "question_reports_select_own" on public.question_reports
  for select to authenticated
  using (auth.uid() = user_id);

-- ── 3. drop question_feedback ────────────────────────────────────────────
-- DEPRECATED since migration 003 (knowledge_schema). Never used in app/ or
-- lib/ — verified with grep -rn "question_feedback" before authoring this
-- migration. No incoming foreign keys; the outgoing FK to questions and the
-- two RLS policies (feedback_insert, feedback_select_own) are dropped
-- automatically by `drop table`. Superseded by question_reports above.

drop table if exists public.question_feedback;
