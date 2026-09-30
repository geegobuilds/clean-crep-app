-- Add-ons, kits and the pickup fee in app bookings.
--
-- Creppie (WhatsApp/IG) already upsells Deep Clean / Sole Refresh / kits and
-- charges J$1,000 for Pickup & Delivery; the app booked a bare service with
-- pickup free. This adds a small catalog of extras and makes the database —
-- not the phone — decide an app order's price.
--
-- Prices mirror Creppie's current list and are meant to be edited here (or in
-- the Supabase table editor) when pricing is revisited; the app reads them
-- live.

create table add_ons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  -- addon: a service extra · kit: a Crep Care product collected at the shop ·
  -- delivery: applied automatically when the customer picks Pickup
  kind text not null check (kind in ('addon', 'kit', 'delivery')),
  price_cents integer, -- null => priced on inspection
  description text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0
);

alter table add_ons enable row level security;
create policy "add_ons_select_public" on add_ons for select using (true);
create policy "add_ons_write_staff" on add_ons for all using (is_staff()) with check (is_staff());

insert into add_ons (slug, name, kind, price_cents, description, sort_order) values
  ('deep-clean',       'Deep Clean Upgrade',  'addon',    100000, 'For heavy stains and deep dirt.', 1),
  ('sole-refresh',     'Sole Refresh',        'addon',    150000, 'Whitens yellowed, oxidized soles. Adds ~3 days (sun-dried).', 2),
  ('suede-revive-kit', 'Suede Revive Kit',    'kit',      400000, 'Keep suede and Clarks fresh between cleans.', 10),
  ('sole-refresh-kit', 'Sole Refresh Kit',    'kit',      400000, 'Keep soles white at home.', 11),
  ('pickup-delivery',  'Pickup & Delivery',   'delivery', 100000, 'Kingston and the immediate Corporate Area.', 20)
on conflict (slug) do nothing;

-- What was actually sold, frozen at booking time:
-- [{ "id", "name", "kind", "price_cents" }]. The app sends [{ "id" }] and
-- the trigger below fills in the rest.
alter table orders add column add_ons jsonb not null default '[]'::jsonb;

-- App orders: the server prices the order and normalises what a customer can
-- set. Before this, the phone sent price_cents (and could send any status).
--   • add_ons: only active catalog rows the customer picked; the delivery fee
--     is added iff drop_method = 'pickup' (never picked directly)
--   • price_cents: service price + priced extras; null (= Quote) when the
--     service itself is priced on inspection
--   • status: always starts at 'received'
-- Staff and Creppie (service role, source = 'creppie') are left alone.
create or replace function price_app_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested text[];
  base integer;
  extras integer;
begin
  if new.source <> 'app' or is_staff() then
    return new;
  end if;

  select coalesce(array_agg(e->>'id'), '{}')
    into requested
    from jsonb_array_elements(case when jsonb_typeof(new.add_ons) = 'array' then new.add_ons else '[]'::jsonb end) e;

  select
    coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'kind', a.kind, 'price_cents', a.price_cents) order by a.sort_order), '[]'::jsonb),
    coalesce(sum(a.price_cents), 0)
    into new.add_ons, extras
    from add_ons a
    where a.active
      and ((a.kind <> 'delivery' and a.id::text = any (requested))
        or (a.kind = 'delivery' and new.drop_method = 'pickup'));

  select price_cents into base from services where id = new.service_id;
  new.price_cents := case when base is null then null else base + extras end;
  new.status := 'received';
  return new;
end;
$$;

revoke execute on function price_app_order() from public, anon, authenticated;

-- Runs before the status trigger (which is AFTER), so notifications see the
-- normalised row.
create trigger orders_price_app_order
  before insert on orders
  for each row execute function price_app_order();
