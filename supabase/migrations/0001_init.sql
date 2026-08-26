-- Clean Crep Jamaica — initial schema
-- Mirrors packages/shared/src/{types,status}.ts. Keep those in sync with
-- any change here.

create extension if not exists pgcrypto;

-- ── Enums ──────────────────────────────────────────────────────────────
create type order_status as enum (
  'received', 'in_progress', 'ready_for_pickup', 'completed', 'pending_payment'
);
create type drop_method as enum ('dropoff', 'pickup');
create type notification_type as enum ('ready', 'progress', 'promo', 'received', 'complete');

-- ── Tables ─────────────────────────────────────────────────────────────
create table customers (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  loyalty_points integer not null default 0,
  member_since date not null default current_date,
  created_at timestamptz not null default now()
);

-- Presence of a row here (not a role flag) is what RLS uses to grant
-- dashboard/staff access — see is_staff() below.
create table staff (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role text not null default 'staff',
  created_at timestamptz not null default now()
);

create table services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_cents integer, -- null => "Quote" (e.g. Sole Refresh)
  note text not null default '',
  description text not null default '',
  icon text not null default 'pkg',
  popular boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0
);

create sequence order_number_seq start 42; -- prototype's last demo order was CC-0041

create or replace function generate_order_number()
returns text language sql as $$
  select 'CC-' || lpad(nextval('order_number_seq')::text, 4, '0');
$$;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default generate_order_number(),
  customer_id uuid not null references customers (id) on delete cascade,
  service_id uuid not null references services (id),
  item_name text not null,
  status order_status not null default 'received',
  drop_method drop_method not null default 'dropoff',
  scheduled_date date not null,
  notes text,
  price_cents integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Audit trail; also what the tracker's 4-step progress bar could replay
-- historically. Populated by the trigger below, not written to directly
-- by clients.
create table order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  status order_status not null,
  changed_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  order_id uuid references orders (id) on delete set null,
  type notification_type not null,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index orders_customer_id_idx on orders (customer_id);
create index orders_status_idx on orders (status);
create index order_status_events_order_id_idx on order_status_events (order_id);
create index notifications_customer_id_idx on notifications (customer_id);

-- ── Triggers ───────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_set_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- Fires on order creation and every status change: records the audit
-- event, generates the matching customer notification (mirrors the demo
-- copy in project/app-screens.jsx's NotificationsScreen), and awards
-- loyalty points on completion. security definer so it can write
-- notifications/order_status_events regardless of the caller's RLS grants
-- (customers can't insert into either table directly).
create or replace function handle_order_status_change()
returns trigger language plpgsql security definer as $$
declare
  notif_type notification_type;
  notif_title text;
  notif_body text;
begin
  insert into order_status_events (order_id, status, changed_by)
  values (new.id, new.status, auth.uid());

  case new.status
    when 'received' then
      notif_type := 'received';
      notif_title := 'Order Received';
      notif_body := 'We got your ' || new.item_name || '. Drop-off confirmed.';
    when 'in_progress' then
      notif_type := 'progress';
      notif_title := 'In Progress';
      notif_body := 'Your ' || new.item_name || ' is being cleaned right now.';
    when 'ready_for_pickup' then
      notif_type := 'ready';
      notif_title := 'Ready for Pickup';
      notif_body := 'Your ' || new.item_name || ' is clean and waiting for pickup.';
    when 'completed' then
      notif_type := 'complete';
      notif_title := 'Order Completed';
      notif_body := 'Your ' || new.item_name || ' has been picked up. Step clean!';
    when 'pending_payment' then
      notif_type := 'promo';
      notif_title := 'Payment Pending';
      notif_body := 'Payment is pending on your ' || new.item_name || ' order.';
  end case;

  insert into notifications (customer_id, order_id, type, title, body)
  values (new.customer_id, new.id, notif_type, notif_title, notif_body);

  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    update customers set loyalty_points = loyalty_points + 50 where id = new.customer_id;
  end if;

  return new;
end;
$$;

create trigger on_order_status_change
  after insert or update of status on orders
  for each row execute function handle_order_status_change();

-- ── Row Level Security ────────────────────────────────────────────────
alter table customers enable row level security;
alter table staff enable row level security;
alter table services enable row level security;
alter table orders enable row level security;
alter table order_status_events enable row level security;
alter table notifications enable row level security;

-- security definer + stable: safe to call from any RLS policy below
-- without recursing back into staff's own RLS.
create or replace function is_staff()
returns boolean language sql security definer stable as $$
  select exists (select 1 from staff where id = auth.uid());
$$;

-- customers: a customer manages their own profile; staff can see all
create policy "customers_select_own_or_staff" on customers
  for select using (id = auth.uid() or is_staff());
create policy "customers_insert_own" on customers
  for insert with check (id = auth.uid());
create policy "customers_update_own_or_staff" on customers
  for update using (id = auth.uid() or is_staff());

-- staff: only staff can see the staff roster (membership is otherwise
-- managed out-of-band, e.g. via the Supabase dashboard, not self-service)
create policy "staff_select_staff" on staff
  for select using (is_staff());

-- services: public read (landing page + booking use the anon key),
-- writes restricted to staff
create policy "services_select_public" on services
  for select using (true);
create policy "services_write_staff" on services
  for all using (is_staff()) with check (is_staff());

-- orders: a customer sees/creates their own orders; only staff change them
-- (status updates go through the dashboard)
create policy "orders_select_own_or_staff" on orders
  for select using (customer_id = auth.uid() or is_staff());
create policy "orders_insert_own_or_staff" on orders
  for insert with check (customer_id = auth.uid() or is_staff());
create policy "orders_update_staff" on orders
  for update using (is_staff());

-- order_status_events: read-only to clients; writes happen exclusively via
-- the security definer trigger above
create policy "order_status_events_select_own_or_staff" on order_status_events
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_status_events.order_id
        and (o.customer_id = auth.uid() or is_staff())
    )
  );

-- notifications: a customer reads/marks-read their own; staff can read all
create policy "notifications_select_own_or_staff" on notifications
  for select using (customer_id = auth.uid() or is_staff());
create policy "notifications_update_own_or_staff" on notifications
  for update using (customer_id = auth.uid() or is_staff());

-- ── Realtime ───────────────────────────────────────────────────────────
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table notifications;
