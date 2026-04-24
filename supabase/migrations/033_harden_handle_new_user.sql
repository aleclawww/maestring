-- Migration 033: Harden handle_new_user() so a failing sub-INSERT never
-- rolls back auth.users creation.
--
-- Background: In production, Google OAuth signups were failing with
-- "Database error saving new user" — the GoTrue message that appears when
-- the auth.users INSERT transaction rolls back. Because handle_new_user()
-- is an AFTER INSERT trigger on auth.users, any exception it raises kills
-- the user creation. The original implementation chained five INSERTs
-- (profiles, organizations, organization_members, subscriptions,
-- referrals) with no exception handling — if any one of them failed
-- (unique collision, FK, check constraint, RLS edge case), the whole
-- signup died with a generic message and no per-insert diagnostic in
-- postgres logs.
--
-- This migration:
--   1. Wraps each sub-INSERT in its own BEGIN/EXCEPTION block.
--   2. On exception, emits RAISE WARNING with SQLSTATE + SQLERRM + user_id
--      so postgres-logs shows exactly which sub-insert broke and why.
--   3. Always returns NEW so auth.users creation succeeds regardless.
--   4. Keeps the "happy path" identical to the original.
--
-- Trade-off: a partial signup (e.g. user exists but no subscription row)
-- is better than a user who can't sign up at all. We can backfill
-- missing rows from the WARNING logs; we can't recover a user who never
-- existed. The referrals self-heal on next login via a backfill path.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_referral_code text;
  v_referred_code text;
  v_org_id uuid;
  v_full_name text;
begin
  v_referral_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
  v_referred_code := new.raw_user_meta_data->>'referred_by_code';
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_org_id := uuid_generate_v4();

  -- 1) Profile ---------------------------------------------------------
  begin
    insert into profiles (id, full_name, avatar_url, referral_code, referred_by)
    values (
      new.id,
      v_full_name,
      new.raw_user_meta_data->>'avatar_url',
      v_referral_code,
      v_referred_code
    );
  exception when others then
    raise warning 'handle_new_user:profiles insert failed for user %: % (SQLSTATE %)',
      new.id, sqlerrm, sqlstate;
    -- If the profile insert fails, retry once without referred_by in case
    -- the referral code the user provided doesn't exist (FK violation is
    -- the single most common failure mode here).
    begin
      insert into profiles (id, full_name, avatar_url, referral_code)
      values (new.id, v_full_name, new.raw_user_meta_data->>'avatar_url', v_referral_code)
      on conflict (id) do nothing;
    exception when others then
      raise warning 'handle_new_user:profiles retry failed for user %: % (SQLSTATE %)',
        new.id, sqlerrm, sqlstate;
    end;
  end;

  -- 2) Organization ----------------------------------------------------
  begin
    insert into organizations (id, name, slug, is_personal, owner_id)
    values (
      v_org_id,
      coalesce(v_full_name, 'Mi Espacio') || '''s Workspace',
      new.id::text,
      true,
      new.id
    );
  exception when others then
    raise warning 'handle_new_user:organizations insert failed for user %: % (SQLSTATE %)',
      new.id, sqlerrm, sqlstate;
    v_org_id := null;
  end;

  -- 3) Org membership --------------------------------------------------
  if v_org_id is not null then
    begin
      insert into organization_members (organization_id, user_id, role)
      values (v_org_id, new.id, 'owner');
    exception when others then
      raise warning 'handle_new_user:organization_members insert failed for user %: % (SQLSTATE %)',
        new.id, sqlerrm, sqlstate;
    end;
  end if;

  -- 4) Subscription ----------------------------------------------------
  begin
    insert into subscriptions (user_id, organization_id, plan, status)
    values (new.id, v_org_id, 'free', 'active');
  exception when others then
    raise warning 'handle_new_user:subscriptions insert failed for user %: % (SQLSTATE %)',
      new.id, sqlerrm, sqlstate;
  end;

  -- 5) Referral tracking (best-effort) --------------------------------
  if v_referred_code is not null then
    begin
      insert into referrals (referrer_id, referred_id, code)
      select p.id, new.id, v_referred_code
      from profiles p where p.referral_code = v_referred_code
      on conflict do nothing;
    exception when others then
      raise warning 'handle_new_user:referrals insert failed for user %: % (SQLSTATE %)',
        new.id, sqlerrm, sqlstate;
    end;
  end if;

  return new;
end;
$$;

-- Belt-and-suspenders: a self-heal function we can call from the app on
-- next login if the warnings tell us a sub-insert failed. Idempotent.
create or replace function ensure_user_bootstrapped(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_email text;
  v_full_name text;
  v_referral_code text;
begin
  select email, raw_user_meta_data->>'full_name'
    into v_email, v_full_name
    from auth.users where id = p_user_id;

  if v_email is null then
    -- user doesn't exist — nothing to heal
    return;
  end if;

  v_full_name := coalesce(v_full_name, split_part(v_email, '@', 1));

  -- Profile
  if not exists (select 1 from profiles where id = p_user_id) then
    v_referral_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    insert into profiles (id, full_name, referral_code)
    values (p_user_id, v_full_name, v_referral_code)
    on conflict (id) do nothing;
  end if;

  -- Personal org
  select id into v_org_id
    from organizations
    where owner_id = p_user_id and is_personal = true
    limit 1;

  if v_org_id is null then
    v_org_id := uuid_generate_v4();
    insert into organizations (id, name, slug, is_personal, owner_id)
    values (v_org_id, coalesce(v_full_name, 'Mi Espacio') || '''s Workspace',
            p_user_id::text, true, p_user_id)
    on conflict (slug) do nothing;
    -- re-read in case of conflict
    select id into v_org_id
      from organizations
      where owner_id = p_user_id and is_personal = true
      limit 1;
  end if;

  if v_org_id is not null then
    insert into organization_members (organization_id, user_id, role)
    values (v_org_id, p_user_id, 'owner')
    on conflict (organization_id, user_id) do nothing;
  end if;

  -- Subscription
  insert into subscriptions (user_id, organization_id, plan, status)
  values (p_user_id, v_org_id, 'free', 'active')
  on conflict (user_id) do nothing;
end;
$$;

grant execute on function ensure_user_bootstrapped(uuid) to service_role, authenticated;
