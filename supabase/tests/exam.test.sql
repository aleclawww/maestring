-- Exam simulator SQL tests. Cover the three RPCs that make up the scoring
-- path (start/record/submit). A bug here ships "you failed" to someone who
-- passed — or worse, the reverse.

begin;
create extension if not exists pgtap with schema extensions;

set session_replication_role = replica;

select plan(15);

-- ---- Fixtures ----
insert into auth.users (id, email, instance_id, aud, role)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'exam@test.local',
        '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.profiles (id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
on conflict (id) do nothing;

-- A domain + concept + 5 questions, all with known correct_index so we can
-- answer them deterministically.
insert into public.knowledge_domains (id, certification_id, slug, name, exam_weight_percent, sort_order)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aws-saa-c03', 'exam-test-domain', 'Exam Test Domain', 100, 999)
on conflict (id) do nothing;

insert into public.concepts (id, slug, name, domain_id, certification_id, difficulty)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'exam-test-concept', 'Exam Test Concept',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aws-saa-c03', 0.5)
on conflict (id) do nothing;

insert into public.questions (id, concept_id, question_text, options, correct_index, explanation, difficulty)
select gen_random_uuid(), 'cccccccc-cccc-cccc-cccc-cccccccccccc',
       'q' || i, '["a","b","c","d"]'::jsonb, 0, 'why', 0.5
from generate_series(1, 5) as i;

-- =========================================================================
-- start_exam_session
-- =========================================================================
do $$
declare v_id uuid;
begin
  v_id := start_exam_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aws-saa-c03', 5, 130);
  perform set_config('test.session_id', v_id::text, false);
end $$;

select isnt(current_setting('test.session_id')::uuid, NULL, 'start_exam_session returns a session id');

select is(
  (select total_questions from exam_sessions where id = current_setting('test.session_id')::uuid),
  5,
  'session created with requested total_questions'
);

select is(
  (select status::text from exam_sessions where id = current_setting('test.session_id')::uuid),
  'in_progress',
  'new session starts in_progress'
);

select is(
  (select count(*)::int from exam_session_items where session_id = current_setting('test.session_id')::uuid),
  5,
  'exactly total_questions items were locked in'
);

-- Calling again returns the existing in_progress session (one active at a time).
select is(
  start_exam_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aws-saa-c03', 5, 130),
  current_setting('test.session_id')::uuid,
  'second start reuses the active in_progress session'
);

-- =========================================================================
-- record_exam_answer
-- =========================================================================
-- Answer positions 1..4 correctly (correct_index=0), position 5 wrong.
do $$ begin
  perform record_exam_answer('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    current_setting('test.session_id')::uuid, 1, 0, false);
  perform record_exam_answer('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    current_setting('test.session_id')::uuid, 2, 0, false);
  perform record_exam_answer('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    current_setting('test.session_id')::uuid, 3, 0, false);
  perform record_exam_answer('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    current_setting('test.session_id')::uuid, 4, 0, true);  -- flagged
  perform record_exam_answer('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    current_setting('test.session_id')::uuid, 5, 1, false); -- wrong
end $$;

select is(
  (select is_correct from exam_session_items
   where session_id = current_setting('test.session_id')::uuid and position = 1),
  true,
  'correct answer marks is_correct=true'
);

select is(
  (select is_correct from exam_session_items
   where session_id = current_setting('test.session_id')::uuid and position = 5),
  false,
  'wrong answer marks is_correct=false'
);

select is(
  (select flagged from exam_session_items
   where session_id = current_setting('test.session_id')::uuid and position = 4),
  true,
  'flagged bit persists'
);

-- Idempotency: re-recording the same position overwrites, not duplicates.
do $$ begin
  perform record_exam_answer('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    current_setting('test.session_id')::uuid, 5, 0, false);
end $$;
select is(
  (select is_correct from exam_session_items
   where session_id = current_setting('test.session_id')::uuid and position = 5),
  true,
  're-answering a position updates in place (no duplicate row)'
);

-- Cross-user rejection: another user cannot record against this session.
select throws_ok(
  $$select record_exam_answer('dddddddd-dddd-dddd-dddd-dddddddddddd',
    current_setting('test.session_id')::uuid, 1, 0, false)$$,
  NULL,
  NULL,
  'record_exam_answer rejects wrong-user'
);

-- =========================================================================
-- submit_exam_session
-- =========================================================================
-- All 5 answered correctly (after the idempotency overwrite above). Expected:
-- raw=1.0, scaled=1000, passed=true.
select is(
  (select (submit_exam_session(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    current_setting('test.session_id')::uuid
  ))->>'scaled_score')::int,
  1000,
  'all-correct submission scales to 1000'
);

select is(
  (select (scaled_score) from exam_sessions where id = current_setting('test.session_id')::uuid),
  1000,
  'scaled_score persisted on session row'
);

select is(
  (select passed from exam_sessions where id = current_setting('test.session_id')::uuid),
  true,
  'passed=true for 1000 (>= 720)'
);

select is(
  (select status::text from exam_sessions where id = current_setting('test.session_id')::uuid),
  'submitted',
  'session status flips to submitted'
);

-- Idempotent resubmit: returns cached result with already_submitted=true.
select is(
  (select (submit_exam_session(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    current_setting('test.session_id')::uuid
  ))->>'already_submitted')::boolean,
  true,
  'resubmit returns already_submitted=true (idempotent)'
);

select * from finish();
rollback;
