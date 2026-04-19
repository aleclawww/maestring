-- Referrals system

create table referrals (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  converted_at timestamptz,
  credit_applied boolean not null default false,
  unique (referred_id), -- One referral per referred user
  constraint no_self_referral check (referrer_id != referred_id)
);

alter table referrals enable row level security;

create policy "referrals_referrer" on referrals
  using (referrer_id = auth.uid());

create policy "referrals_referred" on referrals
  using (referred_id = auth.uid());
