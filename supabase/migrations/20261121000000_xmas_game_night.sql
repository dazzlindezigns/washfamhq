-- ============================================================================
-- The Washingtons' Christmas Eve Pajama Game Night
-- Everything here is prefixed `xmas_` so it can live in a shared Supabase
-- project without touching any other app's tables.
--
-- Safe to re-run: every statement is idempotent.
--
-- Privacy model
--   * xmas_rsvps (base table) holds contact info + notes. RLS is ON and there
--     are NO policies for anon/authenticated, and table privileges are revoked,
--     so the public anon key cannot read, insert, update, or delete it.
--   * The site's API routes write with the service-role key (server only).
--   * Public pages read ONLY from the xmas_public_rsvps view, which whitelists
--     family name, status, guest count, dish, and game. No phone, email,
--     contact name, note, or edit token ever leaves through it.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- RSVPs
-- ---------------------------------------------------------------------------
create table if not exists public.xmas_rsvps (
  id            uuid primary key default gen_random_uuid(),
  edit_token    uuid not null default gen_random_uuid(),
  family_name   text not null check (char_length(btrim(family_name)) between 1 and 80),
  contact_name  text not null check (char_length(btrim(contact_name)) between 1 and 80),
  status        text not null check (status in ('coming', 'maybe', 'cant')),
  adults        integer not null default 1 check (adults between 0 and 40),
  kids          integer not null default 0 check (kids between 0 and 40),
  kids_ages     text check (kids_ages is null or char_length(kids_ages) <= 120),
  dish_category text check (dish_category is null or dish_category in ('entree', 'side', 'salad', 'dessert', 'fruit', 'drinks')),
  dish          text check (dish is null or char_length(dish) <= 120),
  game          text check (game is null or char_length(game) <= 120),
  contact       text check (contact is null or char_length(contact) <= 160),
  note          text check (note is null or char_length(note) <= 1000),
  is_host       boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists xmas_rsvps_created_at_idx on public.xmas_rsvps (created_at);

create or replace function public.xmas_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists xmas_rsvps_touch_updated_at on public.xmas_rsvps;
create trigger xmas_rsvps_touch_updated_at
  before update on public.xmas_rsvps
  for each row execute function public.xmas_touch_updated_at();

alter table public.xmas_rsvps enable row level security;
-- Lock the base table down completely for client roles.
revoke all on table public.xmas_rsvps from anon, authenticated;
grant all on table public.xmas_rsvps to service_role;

-- ---------------------------------------------------------------------------
-- Public view: the ONLY thing the public site reads RSVPs from.
-- It intentionally runs with the view owner's rights (security_invoker off) so
-- it can see the locked-down table, and it exposes whitelisted columns only.
-- (Supabase's advisor may flag this as a "security definer view". That is the
-- intended design here: the view is the column whitelist.)
-- ---------------------------------------------------------------------------
create or replace view public.xmas_public_rsvps
with (security_invoker = false) as
select
  r.id,
  r.family_name,
  r.status,
  (r.adults + r.kids) as guest_count,
  r.dish_category,
  r.dish,
  r.game,
  r.is_host,
  r.created_at
from public.xmas_rsvps r;

revoke all on table public.xmas_public_rsvps from anon, authenticated;
grant select on table public.xmas_public_rsvps to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Settings: one row (id = 1). Anything null falls back to src/config/event.ts.
-- ---------------------------------------------------------------------------
create table if not exists public.xmas_settings (
  id              integer primary key default 1 check (id = 1),
  title           text,
  event_date      date,
  event_time      text,          -- e.g. '6:00 PM until we fall asleep'. Null = "Time coming soon"
  starts_at       timestamptz,   -- optional exact start, used by the countdown
  location_label  text,          -- e.g. 'At a VRBO. Location to be announced'
  address         text,          -- null until booked; when set, shows with a Maps link
  maps_url        text,          -- optional; generated from the address if empty
  attire          text,
  attire_note     text,
  dish_rule       text,
  tone_line       text,
  category_limits jsonb not null default '{}'::jsonb, -- {"entree": 4, "dessert": 3, ...}; missing/null = no limit
  updated_at      timestamptz not null default now()
);

drop trigger if exists xmas_settings_touch_updated_at on public.xmas_settings;
create trigger xmas_settings_touch_updated_at
  before update on public.xmas_settings
  for each row execute function public.xmas_touch_updated_at();

alter table public.xmas_settings enable row level security;
revoke all on table public.xmas_settings from anon, authenticated;
grant select on table public.xmas_settings to anon, authenticated;
grant all on table public.xmas_settings to service_role;

drop policy if exists xmas_settings_public_read on public.xmas_settings;
create policy xmas_settings_public_read
  on public.xmas_settings
  for select
  to anon, authenticated
  using (true);

insert into public.xmas_settings (id, title, event_date, location_label, attire, attire_note, dish_rule, tone_line, category_limits)
values (
  1,
  'The Washingtons'' Christmas Eve Pajama Game Night',
  '2026-12-24',
  'At a VRBO. Location to be announced',
  'Christmas pajamas (required)',
  'Plaid matching encouraged',
  'Every family brings a dish',
  'fun and festive',
  '{"entree": 4, "side": 6, "salad": 3, "dessert": 4, "fruit": 2, "drinks": 3}'::jsonb
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Rate limiting (used by the API routes, service role only)
-- ---------------------------------------------------------------------------
create table if not exists public.xmas_rate_limits (
  bucket       text primary key,
  window_start timestamptz not null default now(),
  hits         integer not null default 0
);

alter table public.xmas_rate_limits enable row level security;
revoke all on table public.xmas_rate_limits from anon, authenticated;
grant all on table public.xmas_rate_limits to service_role;

-- Returns true if the call is allowed, false if the bucket is over its limit.
create or replace function public.xmas_rate_limit_hit(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits integer;
begin
  insert into public.xmas_rate_limits as rl (bucket, window_start, hits)
  values (p_bucket, now(), 1)
  on conflict (bucket) do update
    set hits = case
                 when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1
                 else rl.hits + 1
               end,
        window_start = case
                 when rl.window_start < now() - make_interval(secs => p_window_seconds) then now()
                 else rl.window_start
               end
  returning hits into v_hits;

  -- Opportunistic cleanup so the table never grows unbounded.
  delete from public.xmas_rate_limits where window_start < now() - interval '1 day';

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.xmas_rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.xmas_rate_limit_hit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Seed the hosts' card (only once). Change counts/dish from /admin.
-- ---------------------------------------------------------------------------
insert into public.xmas_rsvps (family_name, contact_name, status, adults, kids, dish_category, dish, is_host)
select 'The Washingtons', 'Dani', 'coming', 7, 0, null, null, true
where not exists (select 1 from public.xmas_rsvps where is_host);
