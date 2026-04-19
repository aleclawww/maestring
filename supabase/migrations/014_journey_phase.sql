-- Pilar 5 — Acompañamiento a Largo Plazo: journey de 5 fases.
--
--   pre_study     : registrado, sin sesiones, sin fecha de examen
--   active_prep   : preparación activa (>14d para el examen, sesiones recientes)
--   pre_exam      : últimas 2 semanas antes del examen
--   post_cert     : examen pasó, outcome registrado o asumido
--   maintenance   : a >90d post-examen, mantiene conocimiento (refresher)
--
-- La fase NO la elige el usuario — la deriva el sistema desde
-- exam_target_date + last_study_date + outcome conocido. Esto permite
-- adaptar tono/contenido de emails, dashboard, recomendaciones.

create type journey_phase as enum (
  'pre_study', 'active_prep', 'pre_exam', 'post_cert', 'maintenance'
);

alter table profiles
  add column if not exists journey_phase journey_phase not null default 'pre_study',
  add column if not exists exam_outcome text check (exam_outcome in ('passed', 'failed', 'unknown') or exam_outcome is null),
  -- Snapshot del readiness a fecha — alimenta los emails de reactivación con
  -- pérdida real ("tu retention bajó del 78% al 51%") en lugar de mensajes
  -- genéricos.
  add column if not exists last_readiness_score numeric,
  add column if not exists last_readiness_at timestamptz;

-- Helper: deriva la journey_phase actual del usuario. Idempotente.
create or replace function compute_journey_phase(p_user_id uuid)
returns journey_phase
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_exam_date date;
  v_outcome text;
  v_last_session timestamptz;
  v_session_count int;
  v_days_to_exam int;
  v_days_since_exam int;
begin
  select exam_target_date, exam_outcome
  into v_exam_date, v_outcome
  from profiles where id = p_user_id;

  select max(created_at), count(*)
  into v_last_session, v_session_count
  from study_sessions
  where user_id = p_user_id and (status = 'completed' or is_completed = true);

  if v_exam_date is null and (v_session_count is null or v_session_count = 0) then
    return 'pre_study';
  end if;

  if v_exam_date is not null then
    v_days_to_exam := v_exam_date - current_date;
    v_days_since_exam := current_date - v_exam_date;

    if v_days_since_exam > 90 then
      return 'maintenance';
    end if;
    if v_days_since_exam >= 0 then
      return 'post_cert';
    end if;
    if v_days_to_exam <= 14 then
      return 'pre_exam';
    end if;
  end if;

  return 'active_prep';
end;
$$;

-- Snapshot the current readiness for delta-based reactivation emails.
create or replace function snapshot_readiness(p_user_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score numeric;
begin
  select score into v_score from get_exam_readiness(p_user_id, 'aws-saa-c03');

  update profiles
  set last_readiness_score = v_score,
      last_readiness_at = now()
  where id = p_user_id;

  return v_score;
end;
$$;

grant execute on function compute_journey_phase(uuid) to authenticated;
grant execute on function snapshot_readiness(uuid) to authenticated, service_role;
