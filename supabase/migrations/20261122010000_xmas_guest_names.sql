-- ============================================================================
-- Update 3: guest names. Safe to re-run.
-- Names are PUBLIC (shown on each family's card). Kids' ages stay private:
-- the view exposes names only, never the full guests JSON.
-- ============================================================================

alter table public.xmas_rsvps
  add column if not exists guests jsonb not null default '[]'::jsonb;

alter table public.xmas_rsvps drop constraint if exists xmas_rsvps_guests_check;
alter table public.xmas_rsvps
  add constraint xmas_rsvps_guests_check
  check (jsonb_typeof(guests) = 'array' and jsonb_array_length(guests) <= 80);

-- Paper goods now include forks and spoons; families bring serving utensils for their dish.
update public.xmas_settings set dish_rule = 'Every family brings a finger-food dish (plus serving utensils for it)'
where id = 1 and dish_rule = 'Every family brings a finger-food dish';

-- Public view: add guest names (names only) as the last column.
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
  r.created_at,
  coalesce(
    (select array_agg(g->>'name' order by ord)
       from jsonb_array_elements(r.guests) with ordinality as e(g, ord)
      where coalesce(btrim(g->>'name'), '') <> ''),
    '{}'::text[]
  ) as guest_names
from public.xmas_rsvps r;

revoke all on table public.xmas_public_rsvps from anon, authenticated;
grant select on table public.xmas_public_rsvps to anon, authenticated, service_role;
