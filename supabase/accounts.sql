-- ============================================================
-- JAMIX PRO UG — User accounts migration
-- Run once in the Supabase SQL Editor, after supabase/schema.sql
-- (it uses public.is_admin() and the admins allowlist from there).
--
-- Safe to re-run. It creates the profiles table, the account
-- policies and the avatars bucket. It does not change drops,
-- songs, photos, videos, radio settings or the admins table.
--
-- This does not create users. Sign up through the website.
-- ============================================================

-- ---------- 1. Profiles ----------
-- One row per Supabase Auth user. The auth trigger below copies the
-- email and creation date; passwords and tokens never enter this table.
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  display_name text check (display_name is null or char_length(display_name) between 1 and 60),
  avatar_path  text,
  is_suspended boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists profiles_created_idx on public.profiles (created_at desc);

-- ---------- 2. Keep profiles in step with auth.users ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, created_at)
  values (new.id, new.email, coalesce(new.created_at, pg_catalog.now()))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

revoke all on function public.sync_profile_email() from public;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.sync_profile_email();

-- Backfill accounts that existed before this migration (for example
-- the admin account). Existing rows are left untouched.
insert into public.profiles (id, email, created_at)
select id, email, coalesce(created_at, pg_catalog.now())
from auth.users
where email is not null
on conflict (id) do nothing;

create or replace function public.touch_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_profile();

-- ---------- 3. Row level security ----------
alter table public.profiles enable row level security;

-- A signed-in user reads only their own row; admins read every row.
drop policy if exists "Users read their own profile" on public.profiles;
create policy "Users read their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

-- A user updates only their own row, and not while suspended.
drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id and not is_suspended)
  with check (auth.uid() = id and not is_suspended);

-- No insert or delete policy: rows are created by the auth trigger
-- and removed through the cascade when the auth user is deleted.

-- Column privileges narrow the rule further: even a signed-in user
-- cannot rewrite their email, creation date or suspension flag.
revoke all on public.profiles from anon, authenticated;
grant select (id, email, display_name, avatar_path, is_suspended, created_at, updated_at)
  on public.profiles to authenticated;
grant update (display_name, avatar_path)
  on public.profiles to authenticated;

-- ---------- 4. Admin account management ----------
-- Suspending is the only account action exposed; deleting an Auth
-- user needs the service_role key, which never leaves the server.
create or replace function public.admin_set_user_suspended(target uuid, suspended boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can manage accounts.' using errcode = '42501';
  end if;
  if target = auth.uid() then
    raise exception 'You cannot suspend your own account.';
  end if;
  update public.profiles
    set is_suspended = suspended
    where id = target;
  return found;
end;
$$;

revoke all on function public.admin_set_user_suspended(uuid, boolean) from public;
grant execute on function public.admin_set_user_suspended(uuid, boolean) to authenticated;

-- ---------- 5. Avatars ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Avatars are public" on storage.objects;
create policy "Avatars are public"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users upload their own avatar" on storage.objects;
create policy "Users upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update their own avatar" on storage.objects;
create policy "Users update their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete their own avatar" on storage.objects;
create policy "Users delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------- 6. Refresh the API schema cache ----------
notify pgrst, 'reload schema';
