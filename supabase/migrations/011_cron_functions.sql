-- Migration 011: Cron RPC functions
-- Used by app/api/cron/{nudges,reminders}/route.ts

-- Users with due cards who haven't studied today and want nudges
create or replace function get_users_needing_nudge()
returns table (
  user_id uuid,
  email text,
  first_name text,
  due_count bigint,
  streak_days int,
  days_until_exam int
) language sql security definer stable as $$
  select
    p.id as user_id,
    u.email,
    coalesce(split_part(p.full_name, ' ', 1), 'there') as first_name,
    count(ucs.id) as due_count,
    p.current_streak as streak_days,
    case when p.exam_target_date is not null
         then greatest(0, (p.exam_target_date - current_date)::int)
         else null end as days_until_exam
  from profiles p
  join auth.users u on u.id = p.id
  join user_concept_states ucs on ucs.user_id = p.id
  where (p.notification_preferences->>'nudge_emails')::boolean is not false
    and ucs.next_review_date <= now()
    and not exists (
      select 1 from study_sessions ss
       where ss.user_id = p.id
         and ss.status = 'completed'
         and ss.ended_at >= current_date
    )
  group by p.id, u.email, p.full_name, p.current_streak, p.exam_target_date
  having count(ucs.id) > 0;
$$;

-- Users whose streak just broke (had a streak yesterday, missed today)
create or replace function get_broken_streaks_today()
returns table (
  user_id uuid,
  email text,
  first_name text,
  previous_streak int
) language sql security definer stable as $$
  select
    p.id as user_id,
    u.email,
    coalesce(split_part(p.full_name, ' ', 1), 'there') as first_name,
    p.current_streak as previous_streak
  from profiles p
  join auth.users u on u.id = p.id
  where p.current_streak > 1
    and (p.notification_preferences->>'streak_emails')::boolean is not false
    and exists (
      select 1 from study_sessions ss
       where ss.user_id = p.id
         and ss.status = 'completed'
         and date(ss.ended_at) = current_date - interval '1 day'
    )
    and not exists (
      select 1 from study_sessions ss
       where ss.user_id = p.id
         and ss.status = 'completed'
         and date(ss.ended_at) = current_date
    );
$$;

revoke execute on function get_users_needing_nudge() from public;
revoke execute on function get_broken_streaks_today() from public;
grant execute on function get_users_needing_nudge() to service_role;
grant execute on function get_broken_streaks_today() to service_role;
