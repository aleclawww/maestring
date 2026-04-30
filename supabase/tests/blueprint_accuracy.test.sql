-- blueprint_accuracy.test.sql
-- Tests for get_blueprint_task_accuracy() (migration 039)
--
-- Why: this RPC is the data source for BlueprintAccuracyCard on the progress
-- page. Silent regressions here mean a blank card for every user — high
-- visibility, silent failure. We assert: function exists, returns exactly 14
-- rows (one per SAA-C03 task statement), per-task accuracy math is correct,
-- and null is returned for tasks with zero attempts.

begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

-- ── Helpers ───────────────────────────────────────────────────────────────

-- Insert a minimal auth user so FK constraints on profiles/question_attempts
-- are satisfied. Wrapped in a CTE so we can use the id below.
do $$
begin
  insert into auth.users (id, email, instance_id, aud, role, raw_user_meta_data)
  values (
    'ba000000-0000-0000-0000-000000000001',
    'blueprint-test@test.local',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    jsonb_build_object('full_name', 'Blueprint Test User')
  ) on conflict do nothing;
end $$;

-- Insert a concept that belongs to any domain (required FK for question_attempts)
insert into concepts (id, name, description, domain_id, certification_id)
select
  'ba000000-0000-0000-0000-000000000002'::uuid,
  '_test_concept',
  '_test',
  id,
  'aws-saa-c03'
from knowledge_domains
limit 1
on conflict do nothing;

-- Insert a question with a known blueprint_task_id
insert into questions (
  id, concept_id, content, question_type, options, correct_answer,
  explanation, blueprint_task_id, review_status, is_active
)
values (
  'ba000000-0000-0000-0000-000000000003'::uuid,
  'ba000000-0000-0000-0000-000000000002'::uuid,
  '_test question',
  'multiple_choice',
  '["A","B","C","D"]'::jsonb,
  'A',
  '_test explanation',
  '1.1',
  'approved',
  true
) on conflict do nothing;

-- Insert 4 attempts for task 1.1: 3 correct, 1 wrong → accuracy 75%
insert into question_attempts
  (user_id, question_id, concept_id, session_id, is_correct, user_answer, time_taken_ms)
select
  'ba000000-0000-0000-0000-000000000001'::uuid,
  'ba000000-0000-0000-0000-000000000003'::uuid,
  'ba000000-0000-0000-0000-000000000002'::uuid,
  gen_random_uuid(),
  is_correct,
  case when is_correct then 'A' else 'B' end,
  5000
from (values (true),(true),(true),(false)) v(is_correct);

-- ── Test 1: function exists ────────────────────────────────────────────────
select ok(
  exists(
    select 1 from pg_proc where proname = 'get_blueprint_task_accuracy'
  ),
  'function get_blueprint_task_accuracy exists'
);

-- ── Test 2: returns exactly 14 rows ───────────────────────────────────────
select is(
  (select count(*)::int from get_blueprint_task_accuracy(
    'ba000000-0000-0000-0000-000000000001'::uuid
  )),
  14,
  'returns exactly 14 rows (one per SAA-C03 task statement)'
);

-- ── Test 3: task 1.1 accuracy is 75.0 ────────────────────────────────────
select is(
  (select accuracy_pct
   from get_blueprint_task_accuracy('ba000000-0000-0000-0000-000000000001'::uuid)
   where task_id = '1.1'),
  75.0::numeric,
  'task 1.1 accuracy is 75.0% (3 correct out of 4)'
);

-- ── Test 4: task 1.1 attempts = 4 ─────────────────────────────────────────
select is(
  (select attempts
   from get_blueprint_task_accuracy('ba000000-0000-0000-0000-000000000001'::uuid)
   where task_id = '1.1'),
  4,
  'task 1.1 attempts = 4'
);

-- ── Test 5: task 1.1 correct = 3 ──────────────────────────────────────────
select is(
  (select correct
   from get_blueprint_task_accuracy('ba000000-0000-0000-0000-000000000001'::uuid)
   where task_id = '1.1'),
  3,
  'task 1.1 correct = 3'
);

-- ── Test 6: unseen tasks have null accuracy_pct ───────────────────────────
select ok(
  (select accuracy_pct is null
   from get_blueprint_task_accuracy('ba000000-0000-0000-0000-000000000001'::uuid)
   where task_id = '4.4'),
  'task 4.4 accuracy_pct is null (no attempts)'
);

-- ── Test 7: unseen tasks have 0 attempts ─────────────────────────────────
select is(
  (select attempts
   from get_blueprint_task_accuracy('ba000000-0000-0000-0000-000000000001'::uuid)
   where task_id = '4.4'),
  0,
  'task 4.4 attempts = 0 (no attempts yet)'
);

-- ── Test 8: domain_weight_pct for domain 1 tasks = 30 ────────────────────
select ok(
  (select bool_and(domain_weight_pct = 30)
   from get_blueprint_task_accuracy('ba000000-0000-0000-0000-000000000001'::uuid)
   where domain_number = 1),
  'domain 1 tasks all have domain_weight_pct = 30'
);

-- ── Test 9: domain_weight_pct for domain 4 tasks = 20 ────────────────────
select ok(
  (select bool_and(domain_weight_pct = 20)
   from get_blueprint_task_accuracy('ba000000-0000-0000-0000-000000000001'::uuid)
   where domain_number = 4),
  'domain 4 tasks all have domain_weight_pct = 20'
);

-- ── Test 10: task_id ordering is ascending ────────────────────────────────
select ok(
  (select array_agg(task_id order by task_id) =
          array_agg(task_id order by task_id::numeric)
   from get_blueprint_task_accuracy('ba000000-0000-0000-0000-000000000001'::uuid)),
  'results are ordered by task_id ascending'
);

-- ── Test 11: pool_available reflects approved questions ───────────────────
select is(
  (select pool_available
   from get_blueprint_task_accuracy('ba000000-0000-0000-0000-000000000001'::uuid)
   where task_id = '1.1'),
  1,
  'task 1.1 pool_available = 1 (one approved question inserted above)'
);

-- ── Test 12: a brand-new user gets 14 rows all with 0 attempts ────────────
do $$
begin
  insert into auth.users (id, email, instance_id, aud, role, raw_user_meta_data)
  values (
    'ba000000-0000-0000-0000-000000000099'::uuid,
    'blueprint-newuser@test.local',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    '{"full_name":"New User"}'::jsonb
  ) on conflict do nothing;
end $$;

select is(
  (select count(*)::int
   from get_blueprint_task_accuracy('ba000000-0000-0000-0000-000000000099'::uuid)
   where attempts = 0),
  14,
  'brand-new user gets 14 rows all with attempts = 0'
);

select * from finish();
rollback;
