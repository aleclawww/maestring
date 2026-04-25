-- Migration 040: add weakest blueprint task to get_users_for_weekly_digest
--
-- Extends the existing RPC with two new output columns:
--   weakest_task_id    text  (e.g. '3.3')
--   weakest_task_label text  (e.g. 'High-performing database solutions')
-- Derived from question_attempts joined on questions.blueprint_task_id
-- over the trailing 7 days (min 3 attempts, same threshold as weakest domain).

create or replace function get_users_for_weekly_digest()
returns table (
  user_id uuid,
  email text,
  first_name text,
  -- 7-day activity
  sessions_week int,
  questions_week int,
  correct_week int,
  accuracy_week numeric,
  minutes_week int,
  -- Streak + exam context
  current_streak int,
  days_until_exam int,
  -- Readiness (now vs ~7 days ago)
  readiness_now int,
  readiness_7d_ago int,
  readiness_delta int,
  pass_probability numeric,
  -- Weakness signal — domain
  weakest_domain_slug text,
  weakest_domain_name text,
  weakest_domain_accuracy numeric,
  -- Weakness signal — blueprint task (new)
  weakest_task_id text,
  weakest_task_label text,
  -- Forward-looking
  due_next_7d int,
  -- Simulator highlight
  best_exam_scaled int,
  best_exam_passed boolean
)
language sql
security definer
stable
set search_path = public
as $$
  with base as (
    select
      p.id as user_id,
      u.email,
      coalesce(split_part(p.full_name, ' ', 1), 'there') as first_name,
      p.current_streak,
      p.exam_target_date
    from profiles p
    join auth.users u on u.id = p.id
    where coalesce((p.notification_preferences->>'weekly_recap')::boolean, true) = true
      and u.email is not null
  ),
  sessions_7d as (
    select
      user_id,
      count(*)::int as sessions_week,
      coalesce(sum(questions_answered), 0)::int as questions_week,
      coalesce(sum(correct_answers), 0)::int as correct_week,
      coalesce(sum(extract(epoch from (ended_at - started_at)) / 60), 0)::int as minutes_week
    from study_sessions
    where status = 'completed'
      and ended_at >= now() - interval '7 days'
    group by user_id
  ),
  readiness_now as (
    select distinct on (user_id) user_id, score::int as score, pass_probability
    from readiness_history
    where snapshot_date >= current_date - interval '2 days'
    order by user_id, snapshot_date desc
  ),
  readiness_7d as (
    select distinct on (user_id) user_id, score::int as score
    from readiness_history
    where snapshot_date <= current_date - interval '6 days'
      and snapshot_date >= current_date - interval '14 days'
    order by user_id, snapshot_date desc
  ),
  weakest as (
    select distinct on (qa.user_id)
      qa.user_id,
      kd.slug as domain_slug,
      kd.name as domain_name,
      round(
        (count(*) filter (where qa.is_correct))::numeric / nullif(count(*), 0),
        4
      ) as accuracy
    from question_attempts qa
    join concepts c on c.id = qa.concept_id
    join knowledge_domains kd on kd.id = c.domain_id
    where qa.created_at >= now() - interval '7 days'
    group by qa.user_id, kd.slug, kd.name
    having count(*) >= 3
    order by qa.user_id, accuracy asc nulls last
  ),
  task_labels(task_id, task_label) as (
    values
      ('1.1', 'Secure access to AWS resources'),
      ('1.2', 'Secure workloads and applications'),
      ('1.3', 'Appropriate data security controls'),
      ('2.1', 'Scalable and loosely coupled architectures'),
      ('2.2', 'Highly available / fault-tolerant designs'),
      ('3.1', 'High-performing storage solutions'),
      ('3.2', 'High-performing compute solutions'),
      ('3.3', 'High-performing database solutions'),
      ('3.4', 'High-performing network architectures'),
      ('3.5', 'High-performing data ingestion & transform'),
      ('4.1', 'Cost-optimized storage solutions'),
      ('4.2', 'Cost-optimized compute solutions'),
      ('4.3', 'Cost-optimized database solutions'),
      ('4.4', 'Cost-optimized network architectures')
  ),
  weakest_task as (
    select distinct on (qa.user_id)
      qa.user_id,
      q.blueprint_task_id as task_id,
      tl.task_label,
      round(
        (count(*) filter (where qa.is_correct))::numeric / nullif(count(*), 0),
        4
      ) as accuracy
    from question_attempts qa
    join questions q on q.id = qa.question_id
    join task_labels tl on tl.task_id = q.blueprint_task_id
    where qa.created_at >= now() - interval '7 days'
      and q.blueprint_task_id is not null
    group by qa.user_id, q.blueprint_task_id, tl.task_label
    having count(*) >= 3
    order by qa.user_id, accuracy asc nulls last
  ),
  due_7d as (
    select user_id, count(*)::int as due_next_7d
    from user_concept_states
    where next_review_date <= now() + interval '7 days'
    group by user_id
  ),
  best_exam as (
    select distinct on (user_id)
      user_id, scaled_score, passed
    from exam_sessions
    where status = 'submitted'
      and submitted_at >= now() - interval '30 days'
    order by user_id, scaled_score desc nulls last
  )
  select
    b.user_id,
    b.email,
    b.first_name,
    coalesce(s.sessions_week, 0),
    coalesce(s.questions_week, 0),
    coalesce(s.correct_week, 0),
    case when coalesce(s.questions_week, 0) > 0
         then round(s.correct_week::numeric / s.questions_week, 4)
         else 0::numeric end,
    coalesce(s.minutes_week, 0),
    b.current_streak,
    case when b.exam_target_date is not null
         then greatest(0, (b.exam_target_date - current_date)::int)
         else null end,
    rn.score,
    r7.score,
    case when rn.score is not null and r7.score is not null
         then (rn.score - r7.score)
         else null end,
    rn.pass_probability,
    w.domain_slug,
    w.domain_name,
    w.accuracy,
    wt.task_id,
    wt.task_label,
    coalesce(d.due_next_7d, 0),
    be.scaled_score,
    be.passed
  from base b
  left join sessions_7d s on s.user_id = b.user_id
  left join readiness_now rn on rn.user_id = b.user_id
  left join readiness_7d r7 on r7.user_id = b.user_id
  left join weakest w on w.user_id = b.user_id
  left join weakest_task wt on wt.user_id = b.user_id
  left join due_7d d on d.user_id = b.user_id
  left join best_exam be on be.user_id = b.user_id
  where coalesce(s.sessions_week, 0) > 0
     or coalesce(d.due_next_7d, 0) > 0;
$$;

revoke execute on function get_users_for_weekly_digest() from public, anon, authenticated;
grant execute on function get_users_for_weekly_digest() to service_role;

comment on function get_users_for_weekly_digest() is
  'Weekly digest RPC. Now includes weakest_task_id/weakest_task_label (min 3 attempts, trailing 7d) in addition to weakest domain.';
