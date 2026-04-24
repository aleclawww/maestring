-- Migration 034: Fix search_path for handle_new_user + ensure_user_bootstrapped
-- so pgcrypto / uuid-ossp functions resolve.
--
-- Root cause of the "Database error saving new user" that persisted even AFTER
-- migration 033 hardened the sub-INSERTs:
--
--   handle_new_user() had `set search_path = public`.
--   But gen_random_bytes(pgcrypto) and uuid_generate_v4(uuid-ossp) live in the
--   `extensions` schema, not `public`. The DECLARE block at the top of the
--   function:
--     v_referral_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
--     v_org_id := uuid_generate_v4();
--   fails with "function gen_random_bytes(integer) does not exist".
--
--   Because that failure happens in the DECLARE section — BEFORE the
--   BEGIN/EXCEPTION blocks around each sub-INSERT — the per-insert safety
--   nets added in 033 don't catch it. The exception propagates out of
--   handle_new_user, aborts the AFTER INSERT trigger, and Postgres rolls
--   back the auth.users INSERT. GoTrue then returns "Database error saving
--   new user" to the client.
--
--   Verified against pg_proc: both functions are in schema `extensions` on
--   maestring-prod. auth.users has 0 rows, confirming no signup has ever
--   succeeded on this DB.
--
-- Fix: widen search_path to include `extensions` for both trigger functions
-- and the self-heal RPC. Also schema-qualify the calls belt-and-suspenders
-- so this doesn't regress if a future Supabase platform change re-arranges
-- schemas.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  v_referral_code text;
  v_referred_code text;
  v_org_id uuid;
  v_full_name text;
begin
  -- Schema-qualify so this never regresses if search_path is ever narrowed.
  v_referral_code := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));
  v_referred_code := new.raw_user_meta_data->>'referred_by_code';
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_org_id := extensions.uuid_generate_v4();

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

-- Outer safety net: even if something slips past the per-insert blocks
-- (e.g. a future DECLARE-section change), never let handle_new_user
-- abort the auth.users INSERT. A half-bootstrapped user can always be
-- healed by ensure_user_bootstrapped on next login; a user who can't
-- sign up at all is unrecoverable.
exception when others then
  raise warning 'handle_new_user:outer catch-all for user %: % (SQLSTATE %)',
    new.id, sqlerrm, sqlstate;
  return new;
end;
$$;

-- Self-heal RPC: same search_path fix.
create or replace function ensure_user_bootstrapped(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
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
    return;
  end if;

  v_full_name := coalesce(v_full_name, split_part(v_email, '@', 1));

  if not exists (select 1 from profiles where id = p_user_id) then
    v_referral_code := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));
    insert into profiles (id, full_name, referral_code)
    values (p_user_id, v_full_name, v_referral_code)
    on conflict (id) do nothing;
  end if;

  select id into v_org_id
    from organizations
    where owner_id = p_user_id and is_personal = true
    limit 1;

  if v_org_id is null then
    v_org_id := extensions.uuid_generate_v4();
    insert into organizations (id, name, slug, is_personal, owner_id)
    values (v_org_id, coalesce(v_full_name, 'Mi Espacio') || '''s Workspace',
            p_user_id::text, true, p_user_id)
    on conflict (slug) do nothing;
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

  insert into subscriptions (user_id, organization_id, plan, status)
  values (p_user_id, v_org_id, 'free', 'active')
  on conflict (user_id) do nothing;
end;
$$;

grant execute on function ensure_user_bootstrapped(uuid) to service_role, authenticated;
