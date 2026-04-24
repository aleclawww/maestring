-- handle_new_user trigger tests. Run with: npx supabase test db
--
-- Why: this trigger is the single most fragile part of our signup path.
-- It runs AFTER INSERT on auth.users and does 5 dependent INSERTs; if any
-- one of them raises OR the DECLARE block can't resolve a function, the
-- auth.users INSERT rolls back and GoTrue returns "Database error saving
-- new user" with no diagnostic. That failure mode already happened on
-- prod (gen_random_bytes lived in the `extensions` schema, trigger's
-- search_path was `public` only — migrations 033 + 034 fixed it). This
-- test pins that behavior so it can't silently regress.
--
-- What we assert:
--   1. A fresh auth.users INSERT creates profile + organization +
--      organization_member + subscription rows.
--   2. The trigger survives a "referred_by_code" pointing at a code that
--      doesn't exist (FK violation must not abort auth.users).
--   3. The DECLARE block can resolve gen_random_bytes + uuid_generate_v4
--      regardless of session search_path — the `set search_path` clause
--      on the function must be in place.
--   4. ensure_user_bootstrapped heals a user who somehow ended up in
--      auth.users with no downstream rows (simulated via direct deletes).

begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

-- ---- Test 1: search_path is correct on the trigger functions -----------
select ok(
  (select array_to_string(proconfig, ',') from pg_proc where proname = 'handle_new_user')
    like '%search_path=public, extensions%',
  'handle_new_user has search_path including extensions schema'
);

select ok(
  (select array_to_string(proconfig, ',') from pg_proc where proname = 'ensure_user_bootstrapped')
    like '%search_path=public, extensions%',
  'ensure_user_bootstrapped has search_path including extensions schema'
);

-- ---- Test 2: happy path — fresh user gets all 4 downstream rows --------
-- We run the trigger for real here. Clean up at the end via rollback.
insert into auth.users (id, email, instance_id, aud, role, raw_user_meta_data)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'happy@test.local',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  jsonb_build_object('full_name', 'Happy Path User')
);

select ok(
  exists(select 1 from profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'profile row created by trigger'
);

select is(
  (select full_name from profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'Happy Path User',
  'profile full_name taken from raw_user_meta_data'
);

select ok(
  (select referral_code from profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
    ~ '^[A-F0-9]{8}$',
  'profile referral_code is 8 uppercase hex (extensions.gen_random_bytes resolved)'
);

select ok(
  exists(select 1 from organizations where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and is_personal = true),
  'personal organization created by trigger'
);

select ok(
  exists(
    select 1 from organization_members m
    join organizations o on o.id = m.organization_id
    where m.user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and o.owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and m.role = 'owner'
  ),
  'organization_members owner row created by trigger'
);

select ok(
  exists(select 1 from subscriptions where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and plan = 'free'),
  'subscription row created by trigger with plan=free'
);

-- ---- Test 3: a bad referred_by_code must not abort the signup ----------
-- This is exactly the kind of thing that used to take down auth.users
-- (FK violation on profiles.referred_by → profiles.referral_code).
insert into auth.users (id, email, instance_id, aud, role, raw_user_meta_data)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'bad-referral@test.local',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  jsonb_build_object('full_name', 'Bad Referral', 'referred_by_code', 'NONEXIST')
);

select ok(
  exists(select 1 from auth.users where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  'auth.users row survives bad referred_by_code (trigger does not abort)'
);

select ok(
  exists(select 1 from profiles where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  'profile row created after retry without referred_by (self-heal inside trigger)'
);

-- ---- Test 4: ensure_user_bootstrapped heals a partial bootstrap --------
-- Simulate a user who lost their profile + org rows somehow (e.g. manual
-- cleanup, migration bug, race).
delete from subscriptions where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
delete from organization_members where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
delete from organizations where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
delete from profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select lives_ok(
  $$ select ensure_user_bootstrapped('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid) $$,
  'ensure_user_bootstrapped runs without error'
);

select ok(
  exists(select 1 from profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'ensure_user_bootstrapped re-created profile'
);

select ok(
  exists(select 1 from organizations where owner_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'ensure_user_bootstrapped re-created organization'
);

select ok(
  exists(select 1 from subscriptions where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'ensure_user_bootstrapped re-created subscription'
);

-- ---- Wrap up ----
select * from finish();
rollback;
