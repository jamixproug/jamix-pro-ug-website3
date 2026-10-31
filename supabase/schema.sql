-- ============================================================
-- JAMIX PRO UG — Drops & IDs schema
-- Run this once in the Supabase SQL Editor, then create the
-- admin user and allowlist it (see the last step at the bottom).
-- ============================================================

-- ---------- 1. Tables ----------
create table if not exists public.drops (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 80),
  file_path    text not null,
  sort_order   integer not null default 0,
  is_published boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists drops_sort_idx on public.drops (sort_order, created_at);

-- Accounts allowed into /admin.html. A row here is the only thing
-- that grants write access; signing up alone does nothing.
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

-- ---------- 2. Admin check ----------
-- SECURITY DEFINER so the drops policies can test the allowlist
-- without exposing the admins table to visitors.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- 3. Row level security ----------
alter table public.drops enable row level security;
alter table public.admins enable row level security;

drop policy if exists "Published drops are public" on public.drops;
create policy "Published drops are public"
  on public.drops for select
  using (is_published or public.is_admin());

drop policy if exists "Admins insert drops" on public.drops;
create policy "Admins insert drops"
  on public.drops for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins update drops" on public.drops;
create policy "Admins update drops"
  on public.drops for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins delete drops" on public.drops;
create policy "Admins delete drops"
  on public.drops for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins read admin list" on public.admins;
create policy "Admins read admin list"
  on public.admins for select
  to authenticated
  using (public.is_admin());

-- ---------- 4. Audio storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('drops', 'drops', true, 10485760, array['audio/mpeg', 'audio/mp3'])
on conflict (id) do update
  set public = true,
      file_size_limit = 10485760,
      allowed_mime_types = array['audio/mpeg', 'audio/mp3'];

drop policy if exists "Drop audio is public" on storage.objects;
create policy "Drop audio is public"
  on storage.objects for select
  using (bucket_id = 'drops');

drop policy if exists "Admins upload drop audio" on storage.objects;
create policy "Admins upload drop audio"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'drops' and public.is_admin());

drop policy if exists "Admins update drop audio" on storage.objects;
create policy "Admins update drop audio"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'drops' and public.is_admin());

drop policy if exists "Admins delete drop audio" on storage.objects;
create policy "Admins delete drop audio"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'drops' and public.is_admin());

-- ---------- 5. Seed the clips already on the site ----------
-- Only runs when the table is empty, so it is safe to re-run.
insert into public.drops (title, file_path, sort_order, is_published)
select v.title, v.file_path, v.sort_order, true
from (values
  ('A Kafumbe Hotel',              'assets/audio/A  Kafumbe hotel.mp3',              1),
  ('A & K Htel',                   'assets/audio/A & K htel.mp3',                    2),
  ('A and K Hotel',                'assets/audio/A and K hotel.mp3',                 3),
  ('A and K Road',                 'assets/audio/A and K road.mp3',                  4),
  ('Bright DJay',                  'assets/audio/bright djay.mp3',                   5),
  ('Call 0763 87',                 'assets/audio/call 0 7 6 3 8 7.mp3',              6),
  ('DJ Fred Senior',               'assets/audio/Dj Fred senior.mp3',                7),
  ('For Booking, Call 0763',       'assets/audio/for booking call 0 7 6 3.mp3',      8),
  ('JK Entertainment DJs',         'assets/audio/jk entertainment djays.mp3',        9),
  ('Mr Vibe',                      'assets/audio/Mr Vibe.mp3',                      10),
  ('This JK Entertainment DJs',    'assets/audio/this jk entertainment djays.mp3',  11)
) as v(title, file_path, sort_order)
where not exists (select 1 from public.drops);

-- ---------- 6. Admin account ----------
-- Create the user FIRST: Authentication → Users → Add user, using
-- jamixproug@gmail.com and a strong password, and confirm the user.
-- Then run this whole file. The statement below allowlists that
-- account. If the user does not exist yet it inserts nothing, so
-- re-running this file after creating the user is safe.
insert into public.admins (user_id, email)
select id, email from auth.users where email = 'jamixproug@gmail.com'
on conflict (user_id) do nothing;

-- ---------- 7. Songs ----------
create table if not exists public.songs (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 120),
  artist       text not null default 'JAMIX PRO UG' check (char_length(artist) between 1 and 120),
  audio_path   text not null,
  cover_path   text,
  sort_order   integer not null default 0,
  is_published boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists songs_sort_idx on public.songs (sort_order, created_at);

alter table public.songs enable row level security;

drop policy if exists "Published songs are public" on public.songs;
create policy "Published songs are public"
  on public.songs for select
  using (is_published or public.is_admin());

drop policy if exists "Admins insert songs" on public.songs;
create policy "Admins insert songs"
  on public.songs for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins update songs" on public.songs;
create policy "Admins update songs"
  on public.songs for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins delete songs" on public.songs;
create policy "Admins delete songs"
  on public.songs for delete
  to authenticated
  using (public.is_admin());

-- ---------- 8. Photos ----------
create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 120),
  caption      text check (caption is null or char_length(caption) <= 240),
  file_path    text not null,
  sort_order   integer not null default 0,
  is_published boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists photos_sort_idx on public.photos (sort_order, created_at);

alter table public.photos enable row level security;

drop policy if exists "Published photos are public" on public.photos;
create policy "Published photos are public"
  on public.photos for select
  using (is_published or public.is_admin());

drop policy if exists "Admins insert photos" on public.photos;
create policy "Admins insert photos"
  on public.photos for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins update photos" on public.photos;
create policy "Admins update photos"
  on public.photos for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins delete photos" on public.photos;
create policy "Admins delete photos"
  on public.photos for delete
  to authenticated
  using (public.is_admin());

-- ---------- 9. Songs and photos storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('songs', 'songs', true, 26214400, array['audio/mpeg', 'audio/mp3'])
on conflict (id) do update
  set public = true,
      file_size_limit = 26214400,
      allowed_mime_types = array['audio/mpeg', 'audio/mp3'];

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 8388608,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Song audio is public" on storage.objects;
create policy "Song audio is public"
  on storage.objects for select
  using (bucket_id = 'songs');

drop policy if exists "Admins upload song audio" on storage.objects;
create policy "Admins upload song audio"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'songs' and public.is_admin());

drop policy if exists "Admins update song audio" on storage.objects;
create policy "Admins update song audio"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'songs' and public.is_admin());

drop policy if exists "Admins delete song audio" on storage.objects;
create policy "Admins delete song audio"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'songs' and public.is_admin());

drop policy if exists "Site photos are public" on storage.objects;
create policy "Site photos are public"
  on storage.objects for select
  using (bucket_id = 'photos');

drop policy if exists "Admins upload site photos" on storage.objects;
create policy "Admins upload site photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'photos' and public.is_admin());

drop policy if exists "Admins update site photos" on storage.objects;
create policy "Admins update site photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'photos' and public.is_admin());

drop policy if exists "Admins delete site photos" on storage.objects;
create policy "Admins delete site photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'photos' and public.is_admin());

-- ---------- 10. Videos ----------
create table if not exists public.videos (
  id             uuid primary key default gen_random_uuid(),
  title          text not null check (char_length(title) between 1 and 120),
  description    text check (description is null or char_length(description) <= 500),
  video_path     text not null,
  thumbnail_path text,
  sort_order     integer not null default 0,
  is_published   boolean not null default true,
  created_at     timestamptz not null default now()
);

create index if not exists videos_sort_idx on public.videos (sort_order, created_at);

alter table public.videos enable row level security;

drop policy if exists "Published videos are public" on public.videos;
create policy "Published videos are public"
  on public.videos for select
  using (is_published or public.is_admin());

drop policy if exists "Admins insert videos" on public.videos;
create policy "Admins insert videos"
  on public.videos for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins update videos" on public.videos;
create policy "Admins update videos"
  on public.videos for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins delete videos" on public.videos;
create policy "Admins delete videos"
  on public.videos for delete
  to authenticated
  using (public.is_admin());

-- 50 MB matches the Supabase Free plan upload limit. MP4 and
-- WebM are the two formats every modern browser can play.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 52428800, array['video/mp4', 'video/webm'])
on conflict (id) do update
  set public = true,
      file_size_limit = 52428800,
      allowed_mime_types = array['video/mp4', 'video/webm'];

drop policy if exists "Video files are public" on storage.objects;
create policy "Video files are public"
  on storage.objects for select
  using (bucket_id = 'videos');

drop policy if exists "Admins upload video files" on storage.objects;
create policy "Admins upload video files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'videos' and public.is_admin());

drop policy if exists "Admins update video files" on storage.objects;
create policy "Admins update video files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'videos' and public.is_admin());

drop policy if exists "Admins delete video files" on storage.objects;
create policy "Admins delete video files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'videos' and public.is_admin());

-- ---------- 11. Live radio ----------
-- One row holds the stream URL and station details the public
-- radio page reads. No delete policy: the row is permanent.
create table if not exists public.radio_settings (
  id           integer primary key default 1 check (id = 1),
  station_name text not null default 'JAMIX PRO UG Radio'
               check (char_length(station_name) between 1 and 80),
  tagline      text check (tagline is null or char_length(tagline) <= 160),
  stream_url   text check (stream_url is null or char_length(stream_url) <= 500),
  now_playing  text check (now_playing is null or char_length(now_playing) <= 120),
  logo_path    text,
  is_live      boolean not null default false,
  updated_at   timestamptz not null default now()
);

insert into public.radio_settings (id) values (1)
on conflict (id) do nothing;

alter table public.radio_settings enable row level security;

drop policy if exists "Radio settings are public" on public.radio_settings;
create policy "Radio settings are public"
  on public.radio_settings for select
  using (true);

drop policy if exists "Admins insert radio settings" on public.radio_settings;
create policy "Admins insert radio settings"
  on public.radio_settings for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins update radio settings" on public.radio_settings;
create policy "Admins update radio settings"
  on public.radio_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.touch_radio_settings()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists radio_settings_touch on public.radio_settings;
create trigger radio_settings_touch
  before update on public.radio_settings
  for each row execute function public.touch_radio_settings();

-- ---------- 12. User accounts ----------
-- One row per Supabase Auth user. Passwords and tokens stay inside
-- Supabase Auth and never reach this table.
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

alter table public.profiles enable row level security;

drop policy if exists "Users read their own profile" on public.profiles;
create policy "Users read their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id and not is_suspended)
  with check (auth.uid() = id and not is_suspended);

revoke all on public.profiles from anon, authenticated;
grant select (id, email, display_name, avatar_path, is_suspended, created_at, updated_at)
  on public.profiles to authenticated;
grant update (display_name, avatar_path)
  on public.profiles to authenticated;

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
