-- Base schema: profiles, organizations, subscriptions

-- ---- Enums ----
create type subscription_plan as enum ('free', 'pro', 'pro_annual', 'enterprise');
create type subscription_status as enum ('active', 'trialing', 'past_due', 'canceled', 'incomplete');

-- ---- Profiles ----
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text,
  avatar_url text,
  onboarding_completed boolean not null default false,
  exam_target_date date,
  study_minutes_per_day int not null default 30,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_study_date date,
  referral_code text unique not null default nanoid(8),
  referred_by text references profiles(referral_code),
  total_xp int not null default 0,
  timezone text not null default 'UTC'
);

-- ---- Organizations ----
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  name text not null,
  slug text unique not null,
  is_personal boolean not null default false,
  owner_id uuid not null references auth.users(id) on delete cascade,
  logo_url text
);

create table organization_members (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- ---- Subscriptions ----
create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  plan subscription_plan not null default 'free',
  status subscription_status not null default 'active',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz,
  unique (user_id)
);

-- ---- Trigger: auto-create profile + personal org on signup ----
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_referral_code text;
  v_referred_by text;
  v_org_id uuid;
  v_referred_code text;
begin
  -- Generate referral code
  v_referral_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));

  -- Check if referred
  v_referred_code := new.raw_user_meta_data->>'referred_by_code';

  -- Create profile
  insert into profiles (id, full_name, avatar_url, referral_code, referred_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    v_referral_code,
    v_referred_code
  );

  -- Create personal organization
  v_org_id := uuid_generate_v4();
  insert into organizations (id, name, slug, is_personal, owner_id)
  values (
    v_org_id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Mi Espacio') || '''s Workspace',
    new.id::text,
    true,
    new.id
  );

  -- Add as owner member
  insert into organization_members (organization_id, user_id, role)
  values (v_org_id, new.id, 'owner');

  -- Create free subscription
  insert into subscriptions (user_id, organization_id, plan, status)
  values (new.id, v_org_id, 'free', 'active');

  -- Track referral
  if v_referred_code is not null then
    insert into referrals (referrer_id, referred_id, code)
    select p.id, new.id, v_referred_code
    from profiles p where p.referral_code = v_referred_code
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---- Updated at trigger ----
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on profiles
  for each row execute procedure update_updated_at();

create trigger subscriptions_updated_at before update on subscriptions
  for each row execute procedure update_updated_at();

-- ---- RLS ----
alter table profiles enable row level security;
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table subscriptions enable row level security;

create policy "profiles_self" on profiles
  using (id = auth.uid());

create policy "organizations_member" on organizations
  using (id in (
    select organization_id from organization_members where user_id = auth.uid()
  ));

create policy "org_members_visible" on organization_members
  using (
    organization_id in (
      select organization_id from organization_members where user_id = auth.uid()
    )
  );

create policy "subscriptions_self" on subscriptions
  using (user_id = auth.uid());
