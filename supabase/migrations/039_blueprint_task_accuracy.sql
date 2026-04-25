-- Migration 039: per-blueprint-task accuracy RPC
--
-- Returns accuracy stats per blueprint task (1.1 – 4.4) derived from
-- question_attempts joined on questions.blueprint_task_id.
-- Used by the /progress page BlueprintAccuracyCard.

create or replace function get_blueprint_task_accuracy(
  p_user_id uuid,
  p_certification_id text default 'aws-saa-c03'
)
returns table (
  task_id           text,
  task_label        text,
  domain_number     int,
  domain_name       text,
  domain_weight_pct int,
  attempts          int,
  correct           int,
  accuracy_pct      numeric,   -- 0-100, null when attempts = 0
  pool_available    int        -- approved questions available for this task
)
language sql
stable
security definer
set search_path = public
as $$
  with task_meta(task_id, task_label, domain_number, domain_name, domain_weight_pct) as (
    values
      ('1.1', 'Secure access to AWS resources',              1, 'Design Secure Architectures',       30),
      ('1.2', 'Secure workloads and applications',           1, 'Design Secure Architectures',       30),
      ('1.3', 'Appropriate data security controls',          1, 'Design Secure Architectures',       30),
      ('2.1', 'Scalable and loosely coupled architectures',  2, 'Design Resilient Architectures',    26),
      ('2.2', 'Highly available / fault-tolerant designs',   2, 'Design Resilient Architectures',    26),
      ('3.1', 'High-performing storage solutions',           3, 'Design High-Performing Architectures', 24),
      ('3.2', 'High-performing compute solutions',           3, 'Design High-Performing Architectures', 24),
      ('3.3', 'High-performing database solutions',          3, 'Design High-Performing Architectures', 24),
      ('3.4', 'High-performing network architectures',       3, 'Design High-Performing Architectures', 24),
      ('3.5', 'High-performing data ingestion & transform',  3, 'Design High-Performing Architectures', 24),
      ('4.1', 'Cost-optimized storage solutions',            4, 'Design Cost-Optimized Architectures', 20),
      ('4.2', 'Cost-optimized compute solutions',            4, 'Design Cost-Optimized Architectures', 20),
      ('4.3', 'Cost-optimized database solutions',           4, 'Design Cost-Optimized Architectures', 20),
      ('4.4', 'Cost-optimized network architectures',        4, 'Design Cost-Optimized Architectures', 20)
  ),
  attempt_agg as (
    select
      q.blueprint_task_id,
      count(*)                                    as attempts,
      count(*) filter (where a.is_correct = true) as correct
    from question_attempts a
    join questions q on q.id = a.question_id
    where a.user_id = p_user_id
      and q.blueprint_task_id is not null
    group by q.blueprint_task_id
  ),
  pool_counts as (
    select
      blueprint_task_id,
      count(*) as pool_available
    from questions
    where review_status = 'approved'
      and is_active = true
      and blueprint_task_id is not null
    group by blueprint_task_id
  )
  select
    m.task_id,
    m.task_label,
    m.domain_number,
    m.domain_name,
    m.domain_weight_pct,
    coalesce(aa.attempts, 0)::int                          as attempts,
    coalesce(aa.correct,  0)::int                          as correct,
    case
      when coalesce(aa.attempts, 0) = 0 then null
      else round(aa.correct::numeric / aa.attempts * 100, 1)
    end                                                    as accuracy_pct,
    coalesce(pc.pool_available, 0)::int                    as pool_available
  from task_meta m
  left join attempt_agg aa on aa.blueprint_task_id = m.task_id
  left join pool_counts  pc on pc.blueprint_task_id = m.task_id
  order by m.task_id
$$;

grant execute on function get_blueprint_task_accuracy(uuid, text) to authenticated;

comment on function get_blueprint_task_accuracy(uuid, text) is
  'Per-blueprint-task accuracy for a user. Joins question_attempts with questions.blueprint_task_id. Returns 0 attempts for unseen tasks. Used by BlueprintAccuracyCard.';
