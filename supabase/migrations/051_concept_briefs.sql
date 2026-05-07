-- 051_concept_briefs.sql
-- Phase 2 — Concept Briefs. Short, curated explanations (300-500 words +
-- optional diagram + gotchas) shown to the user before the first question
-- of a concept they have never seen (state='new' in user_concept_states).
--
-- Two changes:
--   1. Create `concept_briefs` keyed by concept_id (1:1 with concepts).
--      "Sin versionado, edición destructiva" per the Phase 2 spec — UPDATE
--      overwrites the previous body. If versioning is ever needed, add a
--      `concept_brief_history` table; do not retrofit a version column.
--   2. Wire updated_at to the existing `update_updated_at()` function from
--      migration 002. No new trigger function — that helper is the repo's
--      canonical pattern (also used by profiles, subscriptions,
--      user_documents, user_concept_states).
--
-- Idempotency: CREATE TABLE / CREATE INDEX use `if (not) exists`. CREATE
-- TRIGGER has no `if not exists` in vanilla Postgres — guarded by `drop
-- trigger if exists` first, matching migration 048's pattern. CREATE POLICY
-- has no guard (migrations 003/044/050 do not guard either). Re-running
-- this file end-to-end requires `npm run db:reset`.

-- ── 1. concept_briefs ────────────────────────────────────────────────────

create table if not exists public.concept_briefs (
  concept_id           uuid primary key references public.concepts(id) on delete cascade,
  title                text not null,
  body_md              text not null,
  gotchas              jsonb,
  related_concept_ids  uuid[],
  diagram_url          text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint concept_briefs_title_length_chk
    check (length(btrim(title)) between 1 and 200),
  constraint concept_briefs_body_length_chk
    check (length(body_md) between 50 and 10000),
  -- Element-level "must be string" validation lives in Zod at the endpoint
  -- layer (POST /api/admin/briefs and PATCH /api/admin/briefs/[conceptId]).
  -- Postgres CHECK constraints cannot contain subqueries (errors with
  -- 0A000 "cannot use subquery in check constraint"), so jsonb_array_elements
  -- can't be used here. Keeping the DB CHECK to "array shape only" is fine
  -- because the only writers are service_role (admin route) — and they
  -- already pass through Zod validation at the application layer.
  constraint concept_briefs_gotchas_shape_chk
    check (gotchas is null or jsonb_typeof(gotchas) = 'array'),
  constraint concept_briefs_diagram_url_chk
    check (diagram_url is null or diagram_url ~ '^https?://')
);

comment on table public.concept_briefs is
  'Short curated brief shown before the first question of a concept the user has never seen (state=''new'' in user_concept_states). 1:1 with concepts via concept_id PK; no versioning per Phase 2 spec — UPDATE overwrites destructively.';
comment on column public.concept_briefs.body_md is
  'Markdown body, target 300-500 words. Rendered client-side by the brief panel component.';
comment on column public.concept_briefs.gotchas is
  'Nullable jsonb array of strings — short bullet-style "watch out for X" callouts. Constraint enforces array shape when present; element-level validation lives at the application layer (admin route).';
comment on column public.concept_briefs.related_concept_ids is
  'Nullable uuid[] linking to other concepts. NOT FK-enforced — Postgres does not foreign-key elements of an array; if a concept referenced here is deleted, this array is left stale until the brief is edited. Acceptable for the 30-brief pilot; revisit with a junction table if briefs scale.';
comment on column public.concept_briefs.diagram_url is
  'Nullable URL to an external diagram (typically Supabase Storage). CHECK ensures the value starts with http(s):// to catch local-path mistakes.';

-- ── 2. RLS ───────────────────────────────────────────────────────────────
-- SELECT open to any authenticated user (the pre-quiz panel needs to read
-- the brief). INSERT/UPDATE/DELETE intentionally have NO policies, so RLS
-- denies them by default; service_role (createAdminClient) bypasses RLS
-- for the admin-edit path per repo convention.

alter table public.concept_briefs enable row level security;

create policy "concept_briefs_select_authenticated" on public.concept_briefs
  for select to authenticated using (true);

-- ── 3. updated_at trigger ────────────────────────────────────────────────
-- Reuses the generic update_updated_at() function defined in migration 002,
-- already attached to profiles, subscriptions, user_documents, and
-- user_concept_states. Same pattern, zero new SQL helpers.

drop trigger if exists concept_briefs_updated_at on public.concept_briefs;
create trigger concept_briefs_updated_at before update on public.concept_briefs
  for each row execute procedure update_updated_at();
