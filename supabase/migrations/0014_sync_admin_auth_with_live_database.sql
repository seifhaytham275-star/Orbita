-- Orbita 0014: bring the repository in line with the live database for platform-admin authentication.
--
-- The live Supabase project already contains the admin credential tables, the setup guard, the
-- per-username login lockout and the three admin functions (they were applied directly as
-- "orbita_admin_self_signup" and "orbita_admin_login_rate_limit"), but no repository migration created
-- them. A new project built only from migrations 0001-0013 therefore had no admin login at all.
--
-- This file is idempotent and non-destructive: it creates objects only if missing and replaces the
-- functions with the exact definitions that are live today. It inserts no data. The one-time setup
-- code hash must be inserted privately by the project owner and must never be committed.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.orbita_admin_credentials (
  id boolean primary key default true check (id = true),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.orbita_admin_setup_guard (
  id boolean primary key default true check (id = true),
  setup_code_hash text not null
);

create table if not exists public.orbita_admin_login_attempts (
  username text primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz
);

alter table public.orbita_admin_credentials enable row level security;
alter table public.orbita_admin_setup_guard enable row level security;
alter table public.orbita_admin_login_attempts enable row level security;

revoke all on public.orbita_admin_credentials from public, anon, authenticated;
revoke all on public.orbita_admin_setup_guard from public, anon, authenticated;
revoke all on public.orbita_admin_login_attempts from public, anon, authenticated;

create or replace function public.orbita_admin_setup_available()
returns boolean
language sql
security definer
set search_path to 'public', 'extensions'
as $function$
  select exists(select 1 from public.orbita_admin_setup_guard where id = true)
     and not exists(select 1 from public.orbita_admin_credentials where id = true);
$function$;

create or replace function public.orbita_create_first_admin(p_setup_code text, p_username text, p_password text)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  expected_hash text;
begin
  if p_username is null or length(trim(p_username)) < 3 or length(trim(p_username)) > 64
     or p_username !~ '^[A-Za-z0-9_.-]+$'
     or p_password is null or length(p_password) < 12 or length(p_password) > 200 then
    return false;
  end if;

  select setup_code_hash into expected_hash
  from public.orbita_admin_setup_guard
  where id = true
  for update;

  if expected_hash is null
     or encode(extensions.digest(coalesce(p_setup_code, ''), 'sha256'), 'hex') <> expected_hash
     or exists(select 1 from public.orbita_admin_credentials where id = true) then
    return false;
  end if;

  insert into public.orbita_admin_credentials (id, username, password_hash)
  values (true, lower(trim(p_username)), extensions.crypt(p_password, extensions.gen_salt('bf', 12)));

  delete from public.orbita_admin_setup_guard where id = true;
  return true;
exception when unique_violation then
  return false;
end;
$function$;

-- Locks a username for 15 minutes after 8 failed attempts inside a 15-minute window.
create or replace function public.orbita_verify_admin_login(p_username text, p_password text)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  normalized_username text := lower(trim(coalesce(p_username, '')));
  stored_hash text;
  current_attempts integer;
  window_start timestamptz;
  lock_time timestamptz;
  valid_password boolean := false;
begin
  if length(normalized_username) < 3 or length(normalized_username) > 64
     or p_password is null or length(p_password) > 200 then
    return false;
  end if;

  insert into public.orbita_admin_login_attempts(username)
  values (normalized_username)
  on conflict (username) do nothing;

  select attempts, window_started_at, locked_until
    into current_attempts, window_start, lock_time
  from public.orbita_admin_login_attempts
  where username = normalized_username
  for update;

  if lock_time is not null and lock_time > now() then
    return false;
  end if;

  if window_start < now() - interval '15 minutes' then
    update public.orbita_admin_login_attempts
       set attempts = 0, window_started_at = now(), locked_until = null
     where username = normalized_username;
    current_attempts := 0;
  end if;

  select password_hash = extensions.crypt(p_password, password_hash)
    into valid_password
  from public.orbita_admin_credentials
  where id = true and username = normalized_username;

  if coalesce(valid_password, false) then
    update public.orbita_admin_login_attempts
       set attempts = 0, window_started_at = now(), locked_until = null
     where username = normalized_username;
    return true;
  end if;

  current_attempts := coalesce(current_attempts, 0) + 1;
  update public.orbita_admin_login_attempts
     set attempts = current_attempts,
         locked_until = case when current_attempts >= 8 then now() + interval '15 minutes' else null end
   where username = normalized_username;
  return false;
end;
$function$;

revoke all on function public.orbita_admin_setup_available() from public, anon, authenticated;
revoke all on function public.orbita_create_first_admin(text, text, text) from public, anon, authenticated;
revoke all on function public.orbita_verify_admin_login(text, text) from public, anon, authenticated;
grant execute on function public.orbita_admin_setup_available() to service_role;
grant execute on function public.orbita_create_first_admin(text, text, text) to service_role;
grant execute on function public.orbita_verify_admin_login(text, text) to service_role;
