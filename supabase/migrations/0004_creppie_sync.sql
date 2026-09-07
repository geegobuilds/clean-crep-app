-- Groundwork for dual-writing Creppie (WhatsApp/IG bookings, via the
-- `clean-crep-systems` n8n workflow) into this database, alongside its
-- existing Airtable write. Creppie customers haven't signed into the app,
-- so they have no `auth.users` row — orders.customer_id becomes nullable
-- and gains guest_* columns as a fallback. Creppie's free-text service
-- names don't always match this app's `services.name` exactly either, so
-- orders.service_id is nullable too (item_name/notes stay the source of
-- truth for what was actually booked) and a small alias table covers the
-- known synonyms.

-- ── orders: guest bookings ────────────────────────────────────────────
alter table orders alter column customer_id drop not null;
alter table orders alter column service_id drop not null;

alter table orders add column source text not null default 'app' check (source in ('app', 'creppie'));
alter table orders add column external_ref text; -- Airtable record id; lets n8n upsert idempotently
alter table orders add column guest_name text;
alter table orders add column guest_phone text;
alter table orders add column guest_email text;
alter table orders add column guest_instagram_handle text;

alter table orders add constraint orders_customer_or_guest
  check (customer_id is not null or guest_name is not null);

create unique index orders_external_ref_idx on orders (external_ref) where external_ref is not null;

-- Guard the status-change trigger: a guest order has no customers row, so
-- skip the notification/loyalty-points side effects that assume one.
create or replace function handle_order_status_change()
returns trigger language plpgsql security definer as $$
declare
  notif_type notification_type;
  notif_title text;
  notif_body text;
begin
  insert into order_status_events (order_id, status, changed_by)
  values (new.id, new.status, auth.uid());

  if new.customer_id is not null then
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
  end if;

  return new;
end;
$$;

-- ── service-name resolution for Creppie's free-text "Service Name" ─────
create table service_aliases (
  alias text primary key,
  service_id uuid not null references services (id)
);

create or replace function resolve_service_id(p_name text)
returns uuid language sql stable as $$
  select coalesce(
    (select id from services where lower(name) = lower(p_name) limit 1),
    (select service_id from service_aliases where lower(alias) = lower(p_name) limit 1)
  );
$$;

insert into service_aliases (alias, service_id)
select 'Sneaker Cleaning', id from services where name = 'Sneaker Clean'
on conflict (alias) do nothing;

insert into service_aliases (alias, service_id)
select 'Clarks Cleaning', id from services where name = 'Clarks Clean'
on conflict (alias) do nothing;

-- ── catalog gap: cap cleaning exists in the live Airtable Services table
-- (Creppie already quotes/books it) but was never added here ────────────
insert into services (name, price_cents, note, description, icon, popular, active, sort_order)
select 'Standard Cap Clean', 150000, '24–48 hrs',
  'Cotton, polyester, dad caps.', 'pkg', false, true, 40
where not exists (select 1 from services where lower(name) = 'standard cap clean');

insert into services (name, price_cents, note, description, icon, popular, active, sort_order)
select 'Premium Cap Clean', 250000, '24–48 hrs',
  'Wool, structured, fitted — hand washed and reshaped on a form.', 'pkg', false, true, 41
where not exists (select 1 from services where lower(name) = 'premium cap clean');

insert into services (name, price_cents, note, description, icon, popular, active, sort_order)
select 'Bucket Hat', 180000, '24–48 hrs',
  'All materials.', 'pkg', false, true, 42
where not exists (select 1 from services where lower(name) = 'bucket hat');
