-- ============================================================
-- JAMIX PRO UG — Videos migration
-- Run this once in the Supabase SQL Editor, after the main
-- supabase/schema.sql has already been applied (it relies on
-- public.is_admin() and the admins allowlist created there).
--
-- Safe to re-run: every object uses IF NOT EXISTS or is dropped
-- and recreated. It does not touch drops, songs or photos.
-- ============================================================

-- ---------- 1. Videos table ----------
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

-- ---------- 2. Row level security ----------
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

-- ---------- 3. Video storage ----------
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

-- Thumbnails are uploaded to the existing public "photos" bucket,
-- which already has public read and admin-only write policies.

-- ---------- 4. Refresh the API schema cache ----------
notify pgrst, 'reload schema';
