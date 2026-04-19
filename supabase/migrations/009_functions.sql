-- PostgreSQL functions for the application

-- Get concepts due for review, ordered by urgency
create or replace function get_concepts_for_review(
  p_user_id uuid,
  p_limit int default 20
)
returns table (
  concept_id uuid,
  slug text,
  name text,
  domain_id uuid,
  stability float,
  difficulty float,
  reps int,
  lapses int,
  state smallint,
  last_review timestamptz,
  next_review_date timestamptz,
  urgency_score float
)
language sql
stable
security definer
as $$
  select
    ucs.concept_id,
    c.slug,
    c.name,
    c.domain_id,
    ucs.stability,
    ucs.difficulty,
    ucs.reps,
    ucs.lapses,
    ucs.state,
    ucs.last_review,
    ucs.next_review_date,
    -- Urgency: higher = more urgent to review
    case
      when ucs.reps = 0 then 100.0
      when ucs.next_review_date < now() then
        extract(epoch from (now() - ucs.next_review_date)) / 3600.0 + 50.0
      else
        greatest(0, (1 - power(0.9, extract(epoch from (now() - coalesce(ucs.last_review, now()))) / 86400.0 / greatest(ucs.stability, 0.1))) * 100)
    end as urgency_score
  from user_concept_states ucs
  join concepts c on c.id = ucs.concept_id
  where ucs.user_id = p_user_id
    and c.is_active = true
    and (ucs.reps = 0 or ucs.next_review_date <= now())
  order by urgency_score desc
  limit p_limit;
$$;

-- Semantic search over content chunks
create or replace function search_content_chunks(
  p_query_embedding vector(1536),
  p_user_id uuid,
  p_match_count int default 5,
  p_threshold float default 0.7
)
returns table (
  id uuid,
  content text,
  document_id uuid,
  chunk_index int,
  similarity float
)
language sql
stable
security definer
as $$
  select
    cc.id,
    cc.content,
    cc.document_id,
    cc.chunk_index,
    1 - (cc.embedding <=> p_query_embedding) as similarity
  from content_chunks cc
  join user_documents ud on cc.document_id = ud.id
  where ud.user_id = p_user_id
    and cc.embedding is not null
    and 1 - (cc.embedding <=> p_query_embedding) >= p_threshold
  order by similarity desc
  limit p_match_count;
$$;

-- Aggregated user stats
create or replace function get_user_stats(p_user_id uuid)
returns table (
  total_sessions bigint,
  total_xp int,
  current_streak int,
  longest_streak int,
  concepts_mastered bigint,
  total_questions_answered bigint,
  correct_answers bigint,
  avg_accuracy float
)
language sql
stable
security definer
as $$
  select
    (select count(*) from study_sessions where user_id = p_user_id and is_completed = true) as total_sessions,
    coalesce((select total_xp from profiles where id = p_user_id), 0) as total_xp,
    coalesce((select current_streak from profiles where id = p_user_id), 0) as current_streak,
    coalesce((select longest_streak from profiles where id = p_user_id), 0) as longest_streak,
    (select count(*) from user_concept_states where user_id = p_user_id and reps >= 5 and lapses <= 1) as concepts_mastered,
    (select count(*) from question_attempts where user_id = p_user_id) as total_questions_answered,
    (select count(*) from question_attempts where user_id = p_user_id and is_correct = true) as correct_answers,
    (select
      case when count(*) = 0 then 0
      else count(*) filter (where is_correct = true)::float / count(*)::float
      end
    from question_attempts where user_id = p_user_id) as avg_accuracy;
$$;

-- Retention probability: FSRS formula R(t) = 0.9^(elapsed/stability)
create or replace function calculate_retention_probability(
  stability float,
  elapsed_days int
)
returns float
language sql
immutable
as $$
  select power(0.9, elapsed_days::float / greatest(stability, 0.1));
$$;

-- Study heatmap data (last N days)
create or replace function get_study_heatmap(
  p_user_id uuid,
  p_days int default 84
)
returns table (
  study_date date,
  session_count bigint,
  questions_answered bigint,
  xp_earned bigint
)
language sql
stable
security definer
as $$
  select
    date_trunc('day', created_at)::date as study_date,
    count(distinct id) as session_count,
    coalesce(sum(concepts_studied), 0) as questions_answered,
    coalesce(sum(xp_earned), 0) as xp_earned
  from study_sessions
  where user_id = p_user_id
    and is_completed = true
    and created_at >= now() - (p_days || ' days')::interval
  group by study_date
  order by study_date;
$$;

-- nanoid function for referral codes
create or replace function nanoid(size int default 8)
returns text
language plpgsql
as $$
declare
  alphabet text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  id text := '';
  i int := 0;
  byte_val int;
begin
  while i < size loop
    byte_val := get_byte(gen_random_bytes(1), 0) % 36;
    id := id || substr(alphabet, byte_val + 1, 1);
    i := i + 1;
  end loop;
  return id;
end;
$$;
