-- Creppie 3.0 moves off Airtable: the lookup data and chat history it reads now
-- live here. Applied to live by Cowork on 2026-09-30 (recorded there as
-- 20260930102700 creppie_lookups_from_airtable); copied into the repo so local
-- runs, CI and future migrations match production.

-- 1. Services: fields Creppie reads that the app schema lacked
alter table public.services
  add column if not exists turnaround_days integer,
  add column if not exists upsell text,
  add column if not exists creppie_notes text;

update public.services set turnaround_days = 2, upsell = 'Sole Refresh' where name = 'Sneaker Clean';
update public.services set turnaround_days = 3, upsell = 'Suede Revive Kit' where name = 'Clarks Clean';
update public.services set turnaround_days = 2, creppie_notes = 'Cotton, polyester, dad caps. 24-48 hours when caps are the only thing in the drop-off; a mixed bag with sneakers takes the sneaker turnaround.' where name = 'Standard Cap Clean';
update public.services set turnaround_days = 2, creppie_notes = 'Wool, structured, fitted. Hand washed, reshaped and dried on a form - that is why it prices above a pair of sneakers. Material decides Standard vs Premium, so Creppie asks before quoting.' where name = 'Premium Cap Clean';
update public.services set turnaround_days = 2, creppie_notes = 'All materials.' where name = 'Bucket Hat';

-- 2. CrepRun delivery zones (copied from Airtable CCJ > Zones, 2026-09-30).
-- rate = round trip (collect + return); delivery_rate = one way.
create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  areas text not null,
  pickup_day text not null,
  rate_cents integer not null,
  delivery_rate_cents integer not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  location_id uuid not null default '00000000-0000-0000-0000-000000000001' references public.locations(id)
);
alter table public.zones enable row level security;
create policy "zones are public read" on public.zones for select using (active);

insert into public.zones (name, areas, pickup_day, rate_cents, delivery_rate_cents, sort_order) values
 ('Zone 1','Half Way Tree, HWT, New Kingston, Cross Roads, Vineyard Town, Trafalgar','Tuesday',150000,75000,1),
 ('Zone 2','Liguanea, Mona, Papine, Barbican, Hope Road, Beverly Hills','Wednesday',200000,100000,2),
 ('Zone 3','Constant Spring, Manor Park, Stony Hill, Golden Spring, Red Hills','Thursday',300000,150000,3),
 ('Zone 4','Portmore, Spanish Town, Greater Portmore','Friday',400000,200000,4),
 ('Zone 5','Duhaney Park, Cooreville Gardens, Patrick City, Waltham Park, Molynes, Washington Gardens, Pembroke Hall','Monday',250000,125000,5)
on conflict (name) do nothing;

-- 3. Creppie chat history (replaces Airtable Conversations). Server-side only:
-- RLS on, no policies, so only n8n's service connection can read or write it.
create table if not exists public.conversations (
  id bigint generated always as identity primary key,
  user_id text not null,
  role text not null check (role in ('user','assistant','seed')),
  message text not null,
  customer text,
  created_at timestamptz not null default now()
);
create index if not exists conversations_user_recent on public.conversations (user_id, created_at desc);
alter table public.conversations enable row level security;

-- 4. Zone requests: customers asking for pickup outside the current zones.
-- Server-side only, like conversations.
create table if not exists public.zone_requests (
  id bigint generated always as identity primary key,
  user_id text,
  area text not null,
  customer text,
  created_at timestamptz not null default now()
);
alter table public.zone_requests enable row level security;
