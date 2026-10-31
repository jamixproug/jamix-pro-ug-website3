-- ============================================================
-- JAMIX PRO UG — Analytics migration
-- Run once in the Supabase SQL Editor, after supabase/schema.sql
-- and supabase/accounts.sql (it uses public.is_admin() and reads
-- the profiles table from accounts.sql).
--
-- Safe to re-run. It creates the analytics_events table, its
-- policies and five admin-only report functions. It does not
-- change drops, songs, photos, videos, radio settings, admins,
-- profiles or any storage bucket.
--
-- Nothing here needs the service-role key, and nothing here
-- deletes or rewrites existing data.
-- ============================================================

-- ---------- 1. Events ----------
-- One row per measured action. The public site may only add rows;
-- it can never read them back. uuid primary keys are used instead
-- of a sequence so that an insert-only grant is enough.
create table if not exists public.analytics_events (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (
                kind in ('page_view', 'clip_play', 'song_play', 'song_download',
                         'video_view', 'radio_play', 'photo_view')
              ),
  page        text not null default '' check (page = '' or char_length(page) <= 120),
  target      text not null default '' check (target = '' or char_length(target) <= 160),
  visitor_id  text not null check (char_length(visitor_id) between 8 and 64),
  created_at  timestamptz not null default now(),
  day         date not null default current_date,
  minute_slot bigint
);

comment on table public.analytics_events is
  'Website, media and download events. Insert-only for visitors, readable only by admins.';

-- The visitor id is a random value kept in the browser, not a person,
-- an account or an IP address.
create index if not exists analytics_events_kind_created_idx
  on public.analytics_events (kind, created_at desc);

create index if not exists analytics_events_created_idx
  on public.analytics_events (created_at desc);

-- ---------- 2. Refresh de-duplication ----------
-- minute_slot is filled by a trigger, so the unique index below sits on
-- plain columns and cannot depend on a volatile expression. One visitor,
-- one action, one page, one item, one minute = one row. Reloading the
-- same page a second later is rejected instead of counted again.
create or replace function public.analytics_set_slot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.minute_slot = floor(extract(epoch from new.created_at) / 60)::bigint;
  new.day = (new.created_at at time zone 'UTC')::date;
  return new;
end;
$$;

revoke all on function public.analytics_set_slot() from public;
grant execute on function public.analytics_set_slot() to anon, authenticated;

drop trigger if exists analytics_slot on public.analytics_events;
create trigger analytics_slot
  before insert on public.analytics_events
  for each row execute function public.analytics_set_slot();

create unique index if not exists analytics_dedupe_idx
  on public.analytics_events (visitor_id, kind, page, target, minute_slot);

-- ---------- 3. Row level security ----------
alter table public.analytics_events enable row level security;

-- Anyone (signed in or not) may record an event. The column checks above
-- and the insert column list below are what limit the content.
drop policy if exists "Visitors record analytics events" on public.analytics_events;
create policy "Visitors record analytics events"
  on public.analytics_events for insert
  to anon, authenticated
  with check (true);

-- Only an admin on the allowlist may read raw rows.
drop policy if exists "Admins read analytics events" on public.analytics_events;
create policy "Admins read analytics events"
  on public.analytics_events for select
  to authenticated
  using (public.is_admin());

-- No update or delete policy on purpose: visitors cannot change or erase
-- history, and the dashboard has no need to.

revoke all on public.analytics_events from anon, authenticated;
grant insert (kind, page, target, visitor_id) on public.analytics_events to anon, authenticated;
grant select on public.analytics_events to authenticated;

-- ---------- 4. Admin report functions ----------
-- Every function re-checks public.is_admin() and raises 42501 for anyone
-- else, so the reports cannot be read by a signed-in visitor even if a
-- policy is ever loosened. All of them return aggregates, never visitor
-- ids. Day buckets are UTC.

-- 4.0 Window start. window_days counts UTC calendar days including today,
-- so 1 means today, 7 the last week, 30 the last month and anything zero
-- or negative means everything since the first recorded event.
create or replace function public.analytics_window_start(window_days integer)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select case
    when coalesce(window_days, 0) <= 0 then '-infinity'::timestamptz
    else (date_trunc('day', now() at time zone 'UTC')
          - make_interval(days => greatest(window_days, 1) - 1)) at time zone 'UTC'
  end;
$$;

revoke all on function public.analytics_window_start(integer) from public;
grant execute on function public.analytics_window_start(integer) to authenticated;

-- 4.1 Totals for the current window, plus the same window before it.
create or replace function public.admin_analytics_summary(window_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  from_ts timestamptz := public.analytics_window_start(window_days);
  current_row jsonb;
  previous_row jsonb;
  user_row jsonb;
  content_row jsonb;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can view analytics.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'visitors', count(distinct e.visitor_id) filter (where e.kind = 'page_view'),
    'page_views', count(*) filter (where e.kind = 'page_view'),
    'unique_pages', count(distinct e.page) filter (where e.kind = 'page_view'),
    'song_plays', count(*) filter (where e.kind = 'song_play'),
    'clip_plays', count(*) filter (where e.kind = 'clip_play'),
    'radio_plays', count(*) filter (where e.kind = 'radio_play'),
    'media_plays', count(*) filter (where e.kind in ('song_play', 'clip_play', 'video_view', 'radio_play')),
    'downloads', count(*) filter (where e.kind = 'song_download'),
    'download_songs', count(distinct e.target) filter (where e.kind = 'song_download'),
    'video_views', count(*) filter (where e.kind = 'video_view'),
    'unique_videos', count(distinct e.target) filter (where e.kind = 'video_view'),
    'photo_views', count(*) filter (where e.kind = 'photo_view'),
    'first_event', min(e.created_at),
    'last_event', max(e.created_at)
  ) into current_row
  from public.analytics_events e
  where e.created_at >= from_ts;

  if coalesce(window_days, 0) > 0 then
    select jsonb_build_object(
      'visitors', count(distinct e.visitor_id) filter (where e.kind = 'page_view'),
      'page_views', count(*) filter (where e.kind = 'page_view'),
      'media_plays', count(*) filter (where e.kind in ('song_play', 'clip_play', 'video_view', 'radio_play')),
      'downloads', count(*) filter (where e.kind = 'song_download'),
      'video_views', count(*) filter (where e.kind = 'video_view')
    ) into previous_row
    from public.analytics_events e
    where e.created_at >= from_ts - make_interval(days => window_days)
      and e.created_at < from_ts;
  else
    previous_row := '{}'::jsonb;
  end if;

  select jsonb_build_object(
    'total', count(*),
    'new', count(*) filter (where p.created_at >= from_ts)
  ) into user_row
  from public.profiles p;

  select jsonb_build_object(
    'songs', (select count(*) from public.songs),
    'songs_published', (select count(*) from public.songs where is_published),
    'photos', (select count(*) from public.photos),
    'photos_published', (select count(*) from public.photos where is_published),
    'videos', (select count(*) from public.videos),
    'videos_published', (select count(*) from public.videos where is_published),
    'drops', (select count(*) from public.drops),
    'drops_published', (select count(*) from public.drops where is_published)
  ) into content_row;

  return jsonb_build_object(
    'window_days', coalesce(window_days, 0),
    'totals', current_row,
    'previous', previous_row,
    'users', user_row,
    'content', content_row
  );
end;
$$;

revoke all on function public.admin_analytics_summary(integer) from public;
grant execute on function public.admin_analytics_summary(integer) to authenticated;

-- 4.2 Chart series. grain is hour, day, week or month. Empty buckets are
-- returned as zero so the chart keeps its shape; a project with no
-- events at all returns an empty list rather than invented numbers.
create or replace function public.admin_analytics_series(window_days integer default 30, grain text default 'day')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  part text := case when grain = 'hour' then 'hour'
                    when grain = 'week' then 'week'
                    when grain = 'month' then 'month'
                    else 'day' end;
  step interval := case when grain = 'hour' then interval '1 hour'
                        when grain = 'week' then interval '1 week'
                        when grain = 'month' then interval '1 month'
                        else interval '1 day' end;
  low_ts timestamptz;
  low_b timestamp;
  high_b timestamp;
  label_format text := case when grain = 'hour' then 'YYYY-MM-DD HH24:00'
                            else 'YYYY-MM-DD' end;
  series jsonb;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can view analytics.' using errcode = '42501';
  end if;

  if coalesce(window_days, 0) <= 0 then
    low_ts := (select min(e.created_at) from public.analytics_events e);
  else
    low_ts := public.analytics_window_start(window_days);
  end if;

  if low_ts is null then
    return jsonb_build_object('grain', part,
                              'events', '[]'::jsonb,
                              'signups', '[]'::jsonb);
  end if;

  low_b := date_trunc(part, low_ts at time zone 'UTC');
  high_b := date_trunc(part, now() at time zone 'UTC');

  with buckets as (
    select generate_series(low_b, high_b, step) as b
  ),
  ev as (
    select date_trunc(part, e.created_at at time zone 'UTC') as b,
           count(distinct e.visitor_id) filter (where e.kind = 'page_view') as visitors,
           count(*) filter (where e.kind = 'page_view') as page_views,
           count(*) filter (where e.kind in ('song_play', 'clip_play', 'radio_play')) as plays,
           count(*) filter (where e.kind = 'song_download') as downloads,
           count(*) filter (where e.kind = 'video_view') as video_views
    from public.analytics_events e
    where e.created_at >= low_ts
    group by 1
  ),
  su as (
    select date_trunc(part, p.created_at at time zone 'UTC') as b,
           count(*) as signups
    from public.profiles p
    where p.created_at >= low_ts
    group by 1
  )
  select jsonb_build_object(
    'grain', part,
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
               'bucket', to_char(b.b, label_format),
               'visitors', coalesce(ev.visitors, 0),
               'page_views', coalesce(ev.page_views, 0),
               'plays', coalesce(ev.plays, 0),
               'downloads', coalesce(ev.downloads, 0),
               'video_views', coalesce(ev.video_views, 0)
             ) order by b.b)
      from buckets b
      left join ev on ev.b = b.b
    ), '[]'::jsonb),
    'signups', coalesce((
      select jsonb_agg(jsonb_build_object(
               'bucket', to_char(b.b, label_format),
               'signups', coalesce(su.signups, 0)
             ) order by b.b)
      from buckets b
      left join su on su.b = b.b
    ), '[]'::jsonb)
  ) into series;

  return series;
end;
$$;

revoke all on function public.admin_analytics_series(integer, text) from public;
grant execute on function public.admin_analytics_series(integer, text) to authenticated;

-- 4.3 Most played, most watched, most downloaded and most opened.
-- sort_by is 'count' for popularity or 'recent' for latest activity.
create or replace function public.admin_analytics_top(event_kind text, window_days integer default 30, item_limit integer default 10, sort_by text default 'count')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  from_ts timestamptz := public.analytics_window_start(window_days);
  limit_rows integer := least(greatest(coalesce(item_limit, 10), 1), 50);
begin
  if not public.is_admin() then
    raise exception 'Only administrators can view analytics.' using errcode = '42501';
  end if;

  if event_kind not in ('page_view', 'clip_play', 'song_play', 'song_download',
                        'video_view', 'radio_play', 'photo_view') then
    raise exception 'Unknown analytics event type.' using errcode = '22023';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'target', r.target,
             'count', r.uses,
             'visitors', r.people,
             'last_at', r.last_at
           ) order by r.rn)
    from (
      select e.target,
             count(*) as uses,
             count(distinct e.visitor_id) as people,
             max(e.created_at) as last_at,
             row_number() over (
               order by case when sort_by = 'recent' then max(e.created_at) end desc nulls last,
                        count(*) desc,
                        e.target asc
             ) as rn
      from public.analytics_events e
      where e.kind = event_kind
        and e.target <> ''
        and e.created_at >= from_ts
      group by e.target
      order by rn
      limit limit_rows
    ) r
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_analytics_top(text, integer, integer, text) from public;
grant execute on function public.admin_analytics_top(text, integer, integer, text) to authenticated;

-- 4.4 Most visited pages, with a visitor count per page.
create or replace function public.admin_analytics_pages(window_days integer default 30, item_limit integer default 10)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  from_ts timestamptz := public.analytics_window_start(window_days);
  limit_rows integer := least(greatest(coalesce(item_limit, 10), 1), 50);
begin
  if not public.is_admin() then
    raise exception 'Only administrators can view analytics.' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'page', r.page,
             'views', r.views,
             'visitors', r.visitors,
             'last_at', r.last_at
           ) order by r.views desc, r.page asc)
    from (
      select e.page,
             count(*) as views,
             count(distinct e.visitor_id) as visitors,
             max(e.created_at) as last_at
      from public.analytics_events e
      where e.kind = 'page_view'
        and e.created_at >= from_ts
      group by e.page
      order by views desc, e.page asc
      limit limit_rows
    ) r
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_analytics_pages(integer, integer) from public;
grant execute on function public.admin_analytics_pages(integer, integer) to authenticated;

-- 4.5 Download history: what was downloaded, from which page and when.
-- Visitor ids are deliberately left out of this report.
create or replace function public.admin_analytics_downloads(window_days integer default 30, item_limit integer default 25)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  from_ts timestamptz := public.analytics_window_start(window_days);
  limit_rows integer := least(greatest(coalesce(item_limit, 25), 1), 100);
begin
  if not public.is_admin() then
    raise exception 'Only administrators can view analytics.' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'target', r.target,
             'page', r.page,
             'at', r.created_at
           ) order by r.created_at desc)
    from (
      select e.target, e.page, e.created_at
      from public.analytics_events e
      where e.kind = 'song_download'
        and e.created_at >= from_ts
      order by e.created_at desc
      limit limit_rows
    ) r
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_analytics_downloads(integer, integer) from public;
grant execute on function public.admin_analytics_downloads(integer, integer) to authenticated;

-- ---------- 5. Refresh the API schema cache ----------
notify pgrst, 'reload schema';
