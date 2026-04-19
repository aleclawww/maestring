-- Enable required PostgreSQL extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- Tiny nanoid implementation (used for short referral codes etc.)
-- Avoids requiring the optional pg_nanoid extension which isn't bundled
-- with the supabase/postgres image by default.
create or replace function nanoid(size int default 21)
returns text
language plpgsql
volatile
as $$
declare
  alphabet text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-';
  id text := '';
  bytes bytea;
  i int;
begin
  bytes := gen_random_bytes(size);
  for i in 0..(size - 1) loop
    id := id || substr(alphabet, (get_byte(bytes, i) % 64) + 1, 1);
  end loop;
  return id;
end
$$;
