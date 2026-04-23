-- 026 — Testimonials: user-submitted quotes with admin approval.
-- Public landing page reads only approved rows. No fake/hardcoded fallback —
-- if the table is empty the landing shows a neutral social-proof strip instead
-- of attributed quotes (compliance with FTC truth-in-advertising).

do $$ begin
  create type testimonial_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists testimonials (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,           -- "Sofia M." — first name + initial
  role text,                            -- "Cloud Engineer"
  content text not null check (char_length(content) between 20 and 500),
  stars smallint not null default 5 check (stars between 1 and 5),
  status testimonial_status not null default 'pending',
  featured boolean not null default false,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reject_reason text,
  -- Provenance so we can show/redact whether they actually passed.
  exam_passed boolean,
  scaled_score int,
  created_at timestamptz not null default now()
);

create index if not exists testimonials_status on testimonials (status);
create index if not exists testimonials_featured on testimonials (featured, status) where status = 'approved';

alter table testimonials enable row level security;

-- Public (anon) can read approved rows only.
create policy "testimonials_public_read_approved" on testimonials
  for select using (status = 'approved');

-- Authenticated users can see their own submissions (any status).
create policy "testimonials_self_read" on testimonials
  for select using (auth.uid() = user_id);

-- Authenticated users can submit one pending testimonial per account
-- (enforced at the app layer too; here we just allow inserts as self).
create policy "testimonials_self_insert" on testimonials
  for insert with check (auth.uid() = user_id);

-- Self-delete while still pending (undo button).
create policy "testimonials_self_delete_pending" on testimonials
  for delete using (auth.uid() = user_id and status = 'pending');

-- Approvals and updates go through service_role / admin RPC, no user policy.

-- ---- Admin RPC: list with filtering ----
create or replace function admin_list_testimonials(
  p_status testimonial_status default null,
  p_limit int default 100
)
returns table (
  id uuid,
  user_id uuid,
  user_email text,
  display_name text,
  role text,
  content text,
  stars smallint,
  status testimonial_status,
  featured boolean,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  exam_passed boolean,
  scaled_score int
)
language sql
security definer
stable
set search_path = public
as $$
  select t.id, t.user_id, u.email, t.display_name, t.role, t.content, t.stars,
         t.status, t.featured, t.submitted_at, t.reviewed_at, t.exam_passed, t.scaled_score
  from testimonials t
  left join auth.users u on u.id = t.user_id
  where p_status is null or t.status = p_status
  order by t.submitted_at desc
  limit p_limit;
$$;

revoke execute on function admin_list_testimonials(testimonial_status, int) from public, anon, authenticated;
grant execute on function admin_list_testimonials(testimonial_status, int) to service_role;
