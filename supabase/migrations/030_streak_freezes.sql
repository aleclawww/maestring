-- 030_streak_freezes.sql
-- Streak freezes: allow a user to miss a day (travel, illness, one-off life
-- friction) without resetting their streak. Proven pattern from Duolingo that
-- triples long-streak retention without inflating inactive users.
--
-- Design:
--   • Each user has up to STREAK_FREEZE_CAP (3) banked freezes.
--   • MONTHLY_GRANT (2) more are granted on their first study of a new month,
--     up to the cap — so they don't compound indefinitely.
--   • When a study session completes with a gap > 1 day, bump_user_streak
--     spends one freeze per missed day (up to what's banked). If freezes cover
--     the whole gap, streak continues; otherwise streak resets to 1.
--   • Every auto-spend is logged in streak_freeze_log for transparency + the
--     dashboard "A freeze saved your streak yesterday" toast.

alter table public.profiles
  add column if not exists streak_freezes_available int not null default 2,
  add column if not exists streak_freezes_last_grant date;

create table if not exists public.streak_freeze_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  missed_date date not null,
  spent_at timestamptz not null default now()
);
create index if not exists streak_freeze_log_user_idx
  on public.streak_freeze_log (user_id, spent_at desc);

alter table public.streak_freeze_log enable row level security;
create policy "streak_freeze_log self read"
  on public.streak_freeze_log for select
  using (auth.uid() = user_id);

-- Rewrite bump_user_streak to consume freezes before resetting.
create or replace function bump_user_streak()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_today date := current_date;
  v_last date;
  v_streak int;
  v_longest int;
  v_freezes int;
  v_last_grant date;
  v_month_start date := date_trunc('month', v_today)::date;
  v_gap int;
  v_needed int;
  v_can_cover boolean;
  v_freeze_cap constant int := 3;
  v_monthly_grant constant int := 2;
begin
  if NEW.status = 'completed' and (OLD.status is distinct from 'completed') then
    select last_study_date, current_streak, longest_streak,
           streak_freezes_available, streak_freezes_last_grant
      into v_last, v_streak, v_longest, v_freezes, v_last_grant
      from profiles where id = NEW.user_id for update;

    -- Monthly freeze grant: top up on first completed session of a new month.
    if v_last_grant is null or v_last_grant < v_month_start then
      v_freezes := least(coalesce(v_freezes, 0) + v_monthly_grant, v_freeze_cap);
      v_last_grant := v_month_start;
    end if;

    if v_last is null then
      v_streak := 1;
    elsif v_today = v_last then
      -- Same-day repeat: keep streak, no change.
      null;
    else
      v_gap := v_today - v_last;
      if v_gap = 1 then
        v_streak := coalesce(v_streak, 0) + 1;
      else
        -- We missed (gap - 1) days. Freezes cover one missed day each.
        v_needed := v_gap - 1;
        v_can_cover := coalesce(v_freezes, 0) >= v_needed;
        if v_can_cover then
          v_streak := coalesce(v_streak, 0) + 1;
          v_freezes := v_freezes - v_needed;
          -- Log each covered day.
          insert into streak_freeze_log(user_id, missed_date)
          select NEW.user_id, generate_series(v_last + 1, v_today - 1, interval '1 day')::date;
        else
          v_streak := 1;
          v_freezes := 0;  -- burn the rest; a full reset wipes the bank.
        end if;
      end if;
    end if;

    if v_streak > coalesce(v_longest, 0) then
      v_longest := v_streak;
    end if;

    update profiles
       set current_streak = v_streak,
           longest_streak = v_longest,
           last_study_date = v_today,
           streak_freezes_available = v_freezes,
           streak_freezes_last_grant = v_last_grant,
           updated_at = now()
     where id = NEW.user_id;
  end if;
  return NEW;
end;
$$;

comment on column public.profiles.streak_freezes_available is
  'Banked streak-freeze credits. Auto-consumed by bump_user_streak to cover missed days before resetting the streak. Capped at 3. Refilled +2 on first study of each month.';
