-- Pilar 2 — Hiperpersonalización Dinámica: cognitive fingerprint
--
-- Stores the per-user signal collected during onboarding (and refined by
-- continuous behavior observation). Lives on profiles to avoid join cost on
-- every personalization decision.
--
-- Shape (subject to extension; consumers must tolerate missing keys):
--   {
--     "background": "developer" | "sysadmin" | "business" | "student" | "other",
--     "peak_hour": 0-23,                    -- detected from session start times
--     "avg_session_length_min": int,        -- detected
--     "weakness_pattern": text,             -- e.g. "cross-service-integration"
--     "study_pace": "sprint" | "cruise",    -- derived from exam_target_date
--     "explanation_depth": "deep" | "concise",
--     "self_level_by_domain": { "<domain_slug>": 0-4 }
--   }
--
-- Seeded by /api/onboarding/calibrate with the explicit self-report fields;
-- behavior-derived fields are populated/overwritten by background jobs as
-- enough sessions accumulate.

alter table profiles
  add column if not exists cognitive_fingerprint jsonb not null default '{}'::jsonb;

-- Pilar 3: Modo Exploración como nuevo valor del enum study_mode.
-- En este modo, las respuestas NO actualizan user_concept_states (el usuario
-- puede explorar sin distorsionar su schedule FSRS).
alter type study_mode add value if not exists 'exploration';

-- Helper: seed user_concept_states from a self-rating (0-4) per domain.
-- Picks up to N concepts per domain (lowest difficulty first so the user gets
-- a fair starting calibration on each domain) and writes initial FSRS values
-- biased by self-rating:
--   level 0 (no knowledge):     difficulty 0.9, stability 0,    state 0 New
--   level 1 (some exposure):    difficulty 0.7, stability 0.5,  state 1 Learning
--   level 2 (basic):            difficulty 0.5, stability 2,    state 2 Review
--   level 3 (intermediate):     difficulty 0.3, stability 7,    state 2 Review
--   level 4 (advanced):         difficulty 0.2, stability 14,   state 2 Review
--
-- The seeded concepts are flagged as "calibrated" via a 0 reps count — first
-- real attempt will move them through normal FSRS scheduling. Stability seeded
-- here is intentionally conservative: better to under-estimate than to skip
-- review of something the user thinks they know.

create or replace function seed_concept_states_from_self_rating(
  p_user_id uuid,
  p_certification_id text,
  p_self_levels jsonb,         -- { "<domain_slug>": 0-4 }
  p_concepts_per_domain int default 5
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted int := 0;
  v_domain record;
  v_level int;
  v_difficulty float;
  v_stability float;
  v_state smallint;
  v_next_review timestamptz;
begin
  for v_domain in
    select id, slug from knowledge_domains
    where certification_id = p_certification_id
  loop
    v_level := coalesce((p_self_levels ->> v_domain.slug)::int, 0);

    case v_level
      when 0 then v_difficulty := 0.9; v_stability := 0;    v_state := 0;
      when 1 then v_difficulty := 0.7; v_stability := 0.5;  v_state := 1;
      when 2 then v_difficulty := 0.5; v_stability := 2;    v_state := 2;
      when 3 then v_difficulty := 0.3; v_stability := 7;    v_state := 2;
      when 4 then v_difficulty := 0.2; v_stability := 14;   v_state := 2;
      else        v_difficulty := 0.5; v_stability := 0;    v_state := 0;
    end case;

    v_next_review := case
      when v_stability > 0 then now() + (v_stability * interval '1 day')
      else now()
    end;

    insert into user_concept_states (
      user_id, concept_id, stability, difficulty, state,
      reps, lapses, elapsed_days, scheduled_days, next_review_date
    )
    select
      p_user_id, c.id, v_stability, v_difficulty, v_state,
      0, 0, 0, ceil(v_stability)::int, v_next_review
    from concepts c
    where c.domain_id = v_domain.id
      and c.is_active = true
    order by c.difficulty asc
    limit p_concepts_per_domain
    on conflict (user_id, concept_id) do nothing;

    get diagnostics v_inserted = row_count;
  end loop;

  return v_inserted;
end;
$$;

grant execute on function seed_concept_states_from_self_rating(uuid, text, jsonb, int) to authenticated;
