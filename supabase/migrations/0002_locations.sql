-- Multi-location groundwork.
--
-- Structure now, features later: this adds a `locations` table and wires
-- every service/order/staff row to one, so a future parish or overseas
-- franchise is a new row, not a schema change. It does NOT add any
-- location-picker UI, per-location RLS scoping, or currency-aware
-- formatting — those are real feature work that should wait until a
-- second location actually exists. Kingston (Half Way Tree) is seeded as
-- the one location and becomes the default for every existing row, so
-- nothing about current app behavior changes.

create table locations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  country text not null,
  currency text not null default 'JMD',
  address_line1 text,
  address_line2 text,
  whatsapp_number text,
  -- 'coming_soon' is for a future waitlist feature (join-the-list for a
  -- city that isn't open yet) — not built yet, just leaving room for it.
  status text not null default 'open' check (status in ('open', 'coming_soon')),
  created_at timestamptz not null default now()
);

alter table locations enable row level security;

create policy "locations_select_public" on locations
  for select using (true);
create policy "locations_write_staff" on locations
  for all using (is_staff()) with check (is_staff());

-- Fixed id so it can be referenced as a literal default below, and so
-- application code can special-case "the original shop" if ever needed.
insert into locations (id, slug, name, country, currency, address_line1, address_line2, whatsapp_number, status)
values (
  '00000000-0000-0000-0000-000000000001',
  'kingston-hwt',
  'Half Way Tree, Kingston',
  'Jamaica',
  'JMD',
  'Shop 19, Pristine Plaza',
  'Half Way Tree, Kingston',
  '18765072163',
  'open'
);

alter table services add column location_id uuid not null default '00000000-0000-0000-0000-000000000001' references locations (id);
alter table services add column currency text not null default 'JMD';

alter table orders add column location_id uuid not null default '00000000-0000-0000-0000-000000000001' references locations (id);
alter table orders add column currency text not null default 'JMD';

alter table staff add column location_id uuid not null default '00000000-0000-0000-0000-000000000001' references locations (id);

create index services_location_id_idx on services (location_id);
create index orders_location_id_idx on orders (location_id);
create index staff_location_id_idx on staff (location_id);
