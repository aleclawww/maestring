-- RLS policy tests. Run with: npx supabase test db
--
-- Why: a regression in any migration that forgets `user_id = auth.uid()` is
-- invisible until a customer reports seeing someone else's data. These tests
-- simulate two authenticated users (A and B) and assert B cannot read, write,
-- or update A's rows on every user-owned table.

begin;
create extension if not exists pgtap with schema extensions;

-- handle_new_user() trigger on auth.users fails inside pg_prove because the
-- security-definer function's pinned search_path can't resolve gen_random_bytes.
-- Bypass ALL triggers for the duration of this test (replica role). Rollback
-- at the end restores the session.
set session_replication_role = replica;

select plan(19);

-- ---- Fixtures ----
-- Two real auth.users rows so FK constraints pass. Fixed UUIDs make assertions
-- deterministic across runs.
insert into auth.users (id, email, instance_id, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- Profiles for both users (created by trigger in some envs; force here).
insert into public.profiles (id)
values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

-- A concept and a session belonging to user A (seeded via bypassing RLS).
-- Seed a knowledge_domain if none exists, then a concept referencing it.
insert into public.knowledge_domains (id, certification_id, slug, name, exam_weight_percent, sort_order)
values ('55555555-5555-5555-5555-555555555555', 'aws-saa-c03', 'rls-test-domain', 'RLS Test Domain', 10, 999)
on conflict (id) do nothing;

insert into public.concepts (id, slug, name, domain_id, certification_id, difficulty)
values (
  '33333333-3333-3333-3333-333333333333',
  'rls-test-concept',
  'RLS Test Concept',
  '55555555-5555-5555-5555-555555555555',
  'aws-saa-c03',
  0.5
)
on conflict (id) do nothing;

insert into public.user_concept_states (user_id, concept_id)
values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333')
on conflict do nothing;

insert into public.study_sessions (id, user_id, mode, certification_id)
values ('44444444-4444-4444-4444-444444444444',
        '11111111-1111-1111-1111-111111111111',
        'review', 'aws-saa-c03')
on conflict (id) do nothing;

insert into public.streak_freeze_log (user_id, missed_date)
values ('11111111-1111-1111-1111-111111111111', current_date - 1)
on conflict do nothing;

-- ---- Helper: impersonate user B (authenticated role with B's JWT sub) ----
create or replace function _as_user_b() returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',
    true
  );
end $$;

create or replace function _as_user_a() returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
    true
  );
end $$;

-- =========================================================================
-- profiles
-- =========================================================================
select _as_user_b();

select is(
  (select count(*)::int from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  0,
  'user B cannot SELECT user A profile'
);

-- UPDATE on A's profile under B's JWT: RLS USING clause makes this a 0-row
-- no-op (rather than a thrown error), which is the intended behavior.
with u as (
  update public.profiles set full_name = 'hacked'
  where id = '11111111-1111-1111-1111-111111111111'
  returning 1
)
select is(
  (select count(*)::int from u),
  0,
  'user B UPDATE on user A profile affects 0 rows'
);
-- Verify A's name still untouched (read as A)
select _as_user_a();
select is(
  (select full_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  NULL,
  'user A profile full_name unchanged after B update attempt'
);

-- =========================================================================
-- user_concept_states
-- =========================================================================
select _as_user_b();

select is(
  (select count(*)::int from public.user_concept_states
   where user_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'user B cannot SELECT user A concept states'
);

select throws_ok(
  $$insert into public.user_concept_states (user_id, concept_id)
    values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333')$$,
  '42501',
  NULL,
  'user B cannot INSERT a concept state for user A (RLS violation)'
);

-- =========================================================================
-- study_sessions
-- =========================================================================
select is(
  (select count(*)::int from public.study_sessions
   where user_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'user B cannot SELECT user A study sessions'
);

-- Update attempt on A's session should affect 0 rows (RLS filter hides it)
with u as (
  update public.study_sessions
  set status = 'completed'
  where id = '44444444-4444-4444-4444-444444444444'
  returning 1
)
select is(
  (select count(*)::int from u),
  0,
  'user B UPDATE on user A session affects 0 rows'
);

select _as_user_a();
select is(
  (select status from public.study_sessions
   where id = '44444444-4444-4444-4444-444444444444'),
  'active',
  'user A session status unchanged by user B attempt'
);

-- =========================================================================
-- question_attempts (insert + select policies)
-- =========================================================================
-- Seed a question row so FK passes, then seed an attempt as user A.
reset role;
insert into public.questions (id, concept_id, question_text, options, correct_index, explanation, difficulty)
values ('66666666-6666-6666-6666-666666666666',
        '33333333-3333-3333-3333-333333333333',
        'test question',
        '["a","b","c","d"]'::jsonb,
        0,
        'because',
        0.5)
on conflict (id) do nothing;

insert into public.question_attempts (user_id, concept_id, question_id, session_id, user_answer_index, is_correct)
values (
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  '66666666-6666-6666-6666-666666666666',
  '44444444-4444-4444-4444-444444444444',
  0,
  true
);
select _as_user_a();

select _as_user_b();

select is(
  (select count(*)::int from public.question_attempts
   where user_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'user B cannot SELECT user A question attempts'
);

-- B needs its own session to insert an attempt (session_id FK).
reset role;
insert into public.study_sessions (id, user_id, mode, certification_id)
values ('77777777-7777-7777-7777-777777777777',
        '22222222-2222-2222-2222-222222222222',
        'review', 'aws-saa-c03')
on conflict (id) do nothing;
select _as_user_b();

select throws_ok(
  $$insert into public.question_attempts (user_id, concept_id, question_id, session_id, user_answer_index, is_correct)
    values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333',
            '66666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444', 0, true)$$,
  '42501',
  NULL,
  'user B cannot INSERT attempt attributed to user A'
);

-- But B CAN insert its own attempt
select lives_ok(
  $$insert into public.question_attempts (user_id, concept_id, question_id, session_id, user_answer_index, is_correct)
    values ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333',
            '66666666-6666-6666-6666-666666666666', '77777777-7777-7777-7777-777777777777', 0, true)$$,
  'user B can insert its own attempt'
);

-- =========================================================================
-- streak_freeze_log
-- =========================================================================
select is(
  (select count(*)::int from public.streak_freeze_log
   where user_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'user B cannot SELECT user A streak freeze log'
);

-- =========================================================================
-- cron_runs: service-role only (no policies → authenticated sees nothing)
-- =========================================================================
-- Seed one run as superuser context (we're in the middle of a test tx; the
-- admin context before _as_user_b still had superuser — so do it via a
-- local reset).
reset role;
insert into public.cron_runs (name, status) values ('rls-test', 'ok');

select _as_user_b();
select is(
  (select count(*)::int from public.cron_runs where name = 'rls-test'),
  0,
  'authenticated user cannot SELECT cron_runs (service-role only)'
);

-- =========================================================================
-- stripe_events: service-role only
-- =========================================================================
reset role;
insert into public.stripe_events (id, type) values ('evt_rls_test', 'test');

select _as_user_b();
select is(
  (select count(*)::int from public.stripe_events where id = 'evt_rls_test'),
  0,
  'authenticated user cannot SELECT stripe_events (service-role only)'
);

-- =========================================================================
-- Sanity: user A CAN see their own data (policies aren't just blanket deny)
-- =========================================================================
select _as_user_a();

select is(
  (select count(*)::int from public.profiles where id = auth.uid()),
  1,
  'user A CAN see their own profile'
);

select is(
  (select count(*)::int from public.user_concept_states where user_id = auth.uid()),
  1,
  'user A CAN see their own concept states'
);

select is(
  (select count(*)::int from public.study_sessions where user_id = auth.uid()),
  1,
  'user A CAN see their own study sessions'
);

select is(
  (select count(*)::int from public.streak_freeze_log where user_id = auth.uid()),
  1,
  'user A CAN see their own streak freeze log'
);

select is(
  (select count(*)::int from public.question_attempts where user_id = auth.uid()),
  1,
  'user A CAN see their own question attempts'
);

select * from finish();
rollback;
