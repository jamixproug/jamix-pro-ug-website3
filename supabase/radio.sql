-- ============================================================
-- JAMIX PRO UG — Live Radio migration
-- Run this once in the Supabase SQL Editor, after the main
-- supabase/schema.sql has already been applied (it relies on
-- public.is_admin() and the admins allowlist created there).
--
-- Safe to re-run. It only creates the radio settings table and
-- its policies; drops, songs, photos and videos are untouched.
-- ============================================================

-- ---------- 1. Radio settings (one row) ----------
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

-- The table holds exactly one row, id = 1.
insert into public.radio_settings (id) values (1)
on conflict (id) do nothing;

-- ---------- 2. Row level security ----------
alter table public.radio_settings enable row level security;

-- Anyone may read the station details; the stream URL is public.
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

-- No delete policy on purpose: the single settings row cannot be
-- removed by accident from the dashboard.

-- ---------- 3. Keep updated_at honest ----------
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

-- ---------- 4. Refresh the API schema cache ----------
notify pgrst, 'reload schema';
