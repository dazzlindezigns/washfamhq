-- ============================================================================
-- Update 2: finger-food menu, prize gift rule, no plaid note, Game Ideas board.
-- Run AFTER 20261121000000_xmas_game_night.sql. Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Finger-food dish categories: meats, sides, chips, desserts, drinks
-- ---------------------------------------------------------------------------
alter table public.xmas_rsvps drop constraint if exists xmas_rsvps_dish_category_check;

-- Move any existing claims onto the new categories.
update public.xmas_rsvps set dish_category = case dish_category
    when 'entree'  then 'meats'
    when 'side'    then 'sides'
    when 'salad'   then 'sides'
    when 'fruit'   then 'sides'
    when 'dessert' then 'desserts'
    else dish_category
  end
where dish_category in ('entree', 'side', 'salad', 'fruit', 'dessert');

alter table public.xmas_rsvps
  add constraint xmas_rsvps_dish_category_check
  check (dish_category is null or dish_category in ('meats', 'sides', 'chips', 'desserts', 'drinks'));

-- ---------------------------------------------------------------------------
-- 2. Settings: new limits, gift rule, finger-food rule, drop the plaid note
-- ---------------------------------------------------------------------------
alter table public.xmas_settings add column if not exists gift_rule text;

update public.xmas_settings
set category_limits = '{"meats": 4, "sides": 4, "chips": 3, "desserts": 4, "drinks": 3}'::jsonb
where id = 1
  and not (category_limits ?| array['meats', 'sides', 'chips', 'desserts']);

update public.xmas_settings set attire_note = null
where id = 1 and attire_note ilike '%plaid%';

update public.xmas_settings set dish_rule = 'Every family brings a finger-food dish'
where id = 1 and dish_rule = 'Every family brings a dish';

update public.xmas_settings set gift_rule = 'Plus one small gift for game prizes'
where id = 1 and gift_rule is null;

-- ---------------------------------------------------------------------------
-- 3. Game Ideas board
-- ---------------------------------------------------------------------------
create table if not exists public.xmas_game_ideas (
  id          uuid primary key default gen_random_uuid(),
  edit_token  uuid not null default gen_random_uuid(),
  title       text not null check (char_length(btrim(title)) between 1 and 80),
  how_to_play text not null check (char_length(btrim(how_to_play)) between 1 and 2000),
  links       jsonb not null default '[]'::jsonb
              check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 8),
  shared_by   text check (shared_by is null or char_length(shared_by) <= 80),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists xmas_game_ideas_created_at_idx on public.xmas_game_ideas (created_at);

drop trigger if exists xmas_game_ideas_touch_updated_at on public.xmas_game_ideas;
create trigger xmas_game_ideas_touch_updated_at
  before update on public.xmas_game_ideas
  for each row execute function public.xmas_touch_updated_at();

alter table public.xmas_game_ideas enable row level security;
revoke all on table public.xmas_game_ideas from anon, authenticated;
grant all on table public.xmas_game_ideas to service_role;

-- Public view: everything except the edit token.
create or replace view public.xmas_public_game_ideas
with (security_invoker = false) as
select g.id, g.title, g.how_to_play, g.links, g.shared_by, g.created_at, g.updated_at
from public.xmas_game_ideas g;

revoke all on table public.xmas_public_game_ideas from anon, authenticated;
grant select on table public.xmas_public_game_ideas to anon, authenticated, service_role;
