-- 0020 — Phase 0 foundations (docs/VISION.md): feature flags, the Vault /
-- Crep Passport data model, and the membership ledger. Nothing here is
-- customer-visible: every new feature is OFF until a flag says otherwise, and
-- staff (plus allow-listed test accounts) can see it early.

-- ── feature flags ─────────────────────────────────────────────────────
create table feature_flags (
  key text primary key check (key ~ '^[a-z][a-z0-9_]*$'),
  description text not null default '',
  enabled_for_all boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Test accounts that see a feature before everyone does.
create table feature_flag_users (
  flag_key text not null references feature_flags (key) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (flag_key, user_id)
);

alter table feature_flags enable row level security;
alter table feature_flag_users enable row level security;
create policy "feature_flags_staff_all" on feature_flags for all using (is_staff()) with check (is_staff());
create policy "feature_flag_users_staff_all" on feature_flag_users for all using (is_staff()) with check (is_staff());

-- On for everyone, or for staff, or for an allow-listed user.
create or replace function feature_enabled(p_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select f.enabled_for_all from feature_flags f where f.key = p_key), false)
      or (exists (select 1 from feature_flags f where f.key = p_key) and is_staff())
      or exists (select 1 from feature_flag_users u where u.flag_key = p_key and u.user_id = auth.uid());
$$;

-- One call for the app/website: the features this viewer can see.
create or replace function my_features()
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(f.key order by f.key), '{}')
    from feature_flags f
   where feature_enabled(f.key);
$$;

insert into feature_flags (key, description) values
  ('vault',           'Digital Vault: every pair a customer has had cleaned, with its care timeline'),
  ('passport',        'Crep Passport: public QR page per pair (care history, grades, verified by Clean Crep)'),
  ('condition_grade', 'AI condition grade at intake and Restoration Score after the clean'),
  ('membership',      'Clean Crep Club: monthly plans with care credits'),
  ('smart_nudges',    'Weather / wear / seasonal care reminders'),
  ('fresh_pairs',     'Fresh Pairs: consignment resale of passport-verified pairs');

-- ── pairs (Vault + Crep Passport) ─────────────────────────────────────
-- Short, unambiguous code printed on the Crep Tag (no 0/O/1/I/L).
create or replace function new_passport_code()
returns text language plpgsql volatile security definer set search_path = public as $$
-- Definer: the collision check must see every pair's code, not just the caller's.
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  code text;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from pairs where passport_code = code);
  end loop;
  return code;
end;
$$;

create table pairs (
  id uuid primary key default gen_random_uuid(),
  -- Owner: an account, or (Creppie / website guests) the reactivation key from
  -- 0017 until they make an account.
  customer_id uuid references customers (id) on delete set null,
  guest_key text,
  category text not null default 'sneaker' check (category in ('sneaker', 'clarks', 'cap', 'other')),
  brand text,
  model text,
  colorway text,
  size text,
  nickname text,
  est_value_cents integer check (est_value_cents is null or est_value_cents >= 0),
  passport_code text unique,
  passport_public boolean not null default true,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (customer_id is not null or guest_key is not null)
);
alter table pairs alter column passport_code set default new_passport_code();

create index pairs_customer_idx on pairs (customer_id);
create index pairs_guest_key_idx on pairs (guest_key) where customer_id is null;

create trigger pairs_set_updated_at before update on pairs
  for each row execute function set_updated_at();

alter table orders add column pair_id uuid references pairs (id) on delete set null;
create index orders_pair_idx on orders (pair_id);

-- Care timeline entries that aren't orders (tag attached, grade, note,
-- authenticity check). Cleans come from orders + order_photos.
create table pair_events (
  id bigint generated always as identity primary key,
  pair_id uuid not null references pairs (id) on delete cascade,
  kind text not null check (kind in ('tag_attached', 'grade', 'note', 'authenticity_check')),
  order_id uuid references orders (id) on delete set null,
  data jsonb not null default '{}',
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index pair_events_pair_idx on pair_events (pair_id, created_at);

alter table pairs enable row level security;
alter table pair_events enable row level security;

-- Owners see and edit their own pairs (Vault on); staff see everything.
create policy "pairs_select_own_or_staff" on pairs for select
  using (is_staff() or (customer_id = auth.uid() and feature_enabled('vault')));
create policy "pairs_insert_own_or_staff" on pairs for insert
  with check (is_staff() or (customer_id = auth.uid() and guest_key is null and feature_enabled('vault')));
create policy "pairs_update_own_or_staff" on pairs for update
  using (is_staff() or (customer_id = auth.uid() and feature_enabled('vault')))
  with check (is_staff() or (customer_id = auth.uid() and guest_key is null));
create policy "pairs_delete_staff" on pairs for delete using (is_staff());

create policy "pair_events_select_own_or_staff" on pair_events for select
  using (is_staff() or exists (
    select 1 from pairs p where p.id = pair_events.pair_id and p.customer_id = auth.uid() and feature_enabled('vault')));
create policy "pair_events_insert_staff" on pair_events for insert with check (is_staff());
create policy "pair_events_delete_staff" on pair_events for delete using (is_staff());

-- Owners can't hand a pair to someone else or forge its passport code.
create or replace function pairs_guard_owner_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  -- App users only (anon/authenticated); trusted definer functions such as a
  -- future claim-my-pairs run as the owner role and pass through.
  if current_user in ('anon', 'authenticated') and not is_staff() then
    if new.customer_id is distinct from old.customer_id
       or new.guest_key is distinct from old.guest_key
       or new.passport_code is distinct from old.passport_code then
      raise exception 'Only staff can change a pair''s owner or passport code' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger pairs_guard_owner_fields before update on pairs
  for each row execute function pairs_guard_owner_fields();

-- Public Crep Passport (scan the tag). No owner details, ever: brand/model,
-- care history dates and photos count, grades. Off until the flag is on.
create or replace function passport(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  p pairs%rowtype;
begin
  if not feature_enabled('passport') then
    return null;
  end if;
  select * into p from pairs where passport_code = upper(trim(p_code)) and passport_public;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'code', p.passport_code,
    'category', p.category,
    'brand', p.brand,
    'model', p.model,
    'colorway', p.colorway,
    'since', (p.created_at at time zone 'America/Jamaica')::date,
    'cleans', coalesce((
      select jsonb_agg(jsonb_build_object(
               'date', (o.created_at at time zone 'America/Jamaica')::date,
               'service', s.name,
               'completed', o.status = 'completed',
               'photos', (select count(*) from order_photos ph where ph.order_id = o.id))
             order by o.created_at)
        from orders o join services s on s.id = o.service_id
       where o.pair_id = p.id), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('kind', e.kind, 'date', (e.created_at at time zone 'America/Jamaica')::date, 'data', e.data)
             order by e.created_at)
        from pair_events e
       where e.pair_id = p.id and e.kind in ('tag_attached', 'grade', 'authenticity_check')), '[]'::jsonb)
  );
end;
$$;

-- ── membership (Clean Crep Club) ──────────────────────────────────────
-- Plans live in the database so prices and perks change without a release.
create table membership_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  credits_per_month integer not null check (credits_per_month >= 0),
  rollover_max integer not null default 0 check (rollover_max >= 0),
  max_household integer not null default 1 check (max_household >= 1),
  perks jsonb not null default '[]',
  active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  plan_id uuid not null references membership_plans (id),
  status text not null default 'pending' check (status in ('pending', 'active', 'paused', 'cancelled')),
  current_period_start date,
  current_period_end date,
  gifted_by uuid references customers (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index memberships_one_live_per_customer on memberships (customer_id) where status in ('pending', 'active', 'paused');
create trigger memberships_set_updated_at before update on memberships
  for each row execute function set_updated_at();

-- Household plans: extra customers who can spend the owner's credits.
create table membership_household (
  membership_id uuid not null references memberships (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (membership_id, customer_id)
);

-- Credits are a ledger: balance = sum(delta). Never edited, only appended.
create table membership_credit_ledger (
  id bigint generated always as identity primary key,
  membership_id uuid not null references memberships (id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('grant', 'rollover', 'redeem', 'expire', 'adjust', 'refund')),
  order_id uuid references orders (id) on delete set null,
  note text,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index membership_credit_ledger_idx on membership_credit_ledger (membership_id, created_at);

-- Manual payments first (bank transfer / Lynk / cash), a card gateway later.
create table membership_payments (
  id bigint generated always as identity primary key,
  membership_id uuid not null references memberships (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  method text not null check (method in ('bank_transfer', 'lynk', 'cash', 'card')),
  reference text,
  period_start date,
  paid_at timestamptz not null default now(),
  recorded_by uuid references auth.users (id) on delete set null default auth.uid()
);

alter table membership_plans enable row level security;
alter table memberships enable row level security;
alter table membership_household enable row level security;
alter table membership_credit_ledger enable row level security;
alter table membership_payments enable row level security;

create policy "membership_plans_select" on membership_plans for select
  using (is_staff() or (active and feature_enabled('membership')));
create policy "membership_plans_write_staff" on membership_plans for all using (is_staff()) with check (is_staff());

-- Members see their own membership, household, credits and payments; only
-- staff write (payments are recorded by staff until there's a gateway).
create or replace function is_membership_viewer(p_membership_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_staff() or exists (
    select 1 from memberships m
     where m.id = p_membership_id
       and (m.customer_id = auth.uid()
            or exists (select 1 from membership_household h where h.membership_id = m.id and h.customer_id = auth.uid())));
$$;

create policy "memberships_select" on memberships for select using (is_membership_viewer(id));
create policy "memberships_write_staff" on memberships for all using (is_staff()) with check (is_staff());
create policy "membership_household_select" on membership_household for select using (is_membership_viewer(membership_id));
create policy "membership_household_write_staff" on membership_household for all using (is_staff()) with check (is_staff());
create policy "membership_credit_ledger_select" on membership_credit_ledger for select using (is_membership_viewer(membership_id));
create policy "membership_credit_ledger_insert_staff" on membership_credit_ledger for insert with check (is_staff());
create policy "membership_payments_select" on membership_payments for select using (is_membership_viewer(membership_id));
create policy "membership_payments_insert_staff" on membership_payments for insert with check (is_staff());

create or replace function membership_credit_balance(p_membership_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select case when is_membership_viewer(p_membership_id)
              then coalesce((select sum(delta) from membership_credit_ledger where membership_id = p_membership_id), 0)::integer
         end;
$$;

-- Draft plans (inactive) so the numbers live somewhere editable. Prices are
-- placeholders for the pilot; change them in the staff Prices page later.
insert into membership_plans (slug, name, price_cents, credits_per_month, rollover_max, max_household, perks, sort_order) values
  ('club', 'Clean Crep Club', 500000, 3, 1, 1,
   '["3 cleans a month (or 2 Clarks)", "Deep Clean upgrades half price", "10% off kits", "1 unused clean rolls over"]', 1),
  ('sneakerhead', 'Sneakerhead', 980000, 4, 1, 1,
   '["4 Deep Cleans a month", "Clarks included", "Priority turnaround", "1 unused clean rolls over"]', 2),
  ('household', 'Household', 1400000, 6, 2, 4,
   '["6 cleans a month shared by up to 4 people", "Everyone gets their own Vault", "2 unused cleans roll over"]', 3);

-- ── grants ────────────────────────────────────────────────────────────
revoke all on function new_passport_code() from public, anon;
grant execute on function new_passport_code() to authenticated; -- column default on pairs
revoke all on function pairs_guard_owner_fields() from public, anon, authenticated;
revoke all on function is_membership_viewer(uuid) from public, anon;
grant execute on function is_membership_viewer(uuid) to authenticated;
grant execute on function feature_enabled(text) to anon, authenticated;
grant execute on function my_features() to anon, authenticated;
grant execute on function passport(text) to anon, authenticated;
revoke all on function membership_credit_balance(uuid) from public, anon;
grant execute on function membership_credit_balance(uuid) to authenticated;
