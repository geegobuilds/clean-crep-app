-- Reactivation upgrade (on top of 0017):
--
-- 1. WELCOMEBACK10 (OFF by default: reactivation_settings.discount_enabled).
--    When on, a nudged customer's next booking within 14 days of the nudge
--    gets 10% off, applied by the database on every channel (app, website,
--    Creppie), once per nudge round. Ship the nudge alone first and only
--    switch the discount on if rebooks are low:
--      update reactivation_settings set discount_enabled = true;
-- 2. Nudge -> booking tracking: reactivation_stats() (staff-only) counts nudged
--    customers and how many booked within 14 days. Done in the database, where
--    the bookings are, so it's exact (no analytics SDK in the loop).
-- 3. Ten-week nudge: once enough nudges have had time to convert (min_sample,
--    default 20) and more than 15% of them rebooked, the daily job turns on a
--    second nudge for customers 70–90 days out. Thresholds live in
--    reactivation_settings so they can be changed without a migration.

-- ── settings (one row) ────────────────────────────────────────────────
create table reactivation_settings (
  id boolean primary key default true check (id),
  discount_enabled boolean not null default false,
  welcome_back_pct integer not null default 10 check (welcome_back_pct between 0 and 50),
  welcome_back_days integer not null default 14,
  conversion_window_days integer not null default 14,
  ten_week_threshold numeric not null default 0.15,
  ten_week_min_sample integer not null default 20,
  ten_week_enabled boolean not null default false,
  ten_week_enabled_at timestamptz
);
insert into reactivation_settings default values;

alter table reactivation_settings enable row level security;
create policy "reactivation_settings_select_staff" on reactivation_settings for select using (is_staff());
create policy "reactivation_settings_update_staff" on reactivation_settings for update using (is_staff()) with check (is_staff());

-- ── nudge stage + redemption ──────────────────────────────────────────
alter table reactivation_nudges add column stage text not null default '5wk' check (stage in ('5wk', '10wk'));
alter table orders add column welcome_back_nudge_id bigint references reactivation_nudges (id) on delete set null;

-- Runs after orders_price_app_order (BEFORE triggers fire in name order), so
-- it discounts the final database price.
create or replace function apply_welcome_back()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  st reactivation_settings%rowtype;
  k text;
  nid bigint;
begin
  if new.price_cents is null then
    return new; -- "Quote" services: staff price these by hand
  end if;
  select * into st from reactivation_settings;
  if not found or not st.discount_enabled or st.welcome_back_pct = 0 then
    return new;
  end if;
  k := reactivation_key(new.customer_id, new.guest_phone, new.guest_email, new.guest_instagram_handle);
  if k is null then
    return new;
  end if;

  select n.id into nid
    from reactivation_nudges n
   where n.customer_key = k
     and n.sent_at > now() - make_interval(days => st.welcome_back_days)
     -- once per round: not if an order already used a nudge from the last 30 days
     and not exists (
       select 1 from orders o join reactivation_nudges n2 on n2.id = o.welcome_back_nudge_id
        where n2.customer_key = k and n2.sent_at > now() - interval '30 days')
   order by n.sent_at desc
   limit 1;
  if nid is null then
    return new;
  end if;

  new.welcome_back_nudge_id := nid;
  new.price_cents := round(new.price_cents * (100 - st.welcome_back_pct) / 100.0)::integer;
  new.notes := concat_ws(' | ', nullif(trim(coalesce(new.notes, '')), ''),
                         'WELCOMEBACK' || st.welcome_back_pct || ': ' || st.welcome_back_pct || '% off applied (due-for-a-clean nudge)');
  return new;
end;
$$;

create trigger orders_zz_welcome_back
  before insert on orders
  for each row execute function apply_welcome_back();

-- ── nudge -> booking stats ────────────────────────────────────────────
-- A "round" = a customer's first nudge in the last 180 days. It counts once
-- it has had the full window to convert, or as soon as it converts.
create or replace function reactivation_stats_internal()
returns table (nudged integer, rebooked integer, rate numeric, pending integer)
language sql stable security definer set search_path = public as $$
  with st as (select conversion_window_days as w from reactivation_settings),
  rounds as (
    select n.customer_key, min(n.sent_at) as first_sent
      from reactivation_nudges n
     where n.sent_at > now() - interval '180 days'
     group by n.customer_key
  ),
  scored as (
    select r.*,
           exists (
             select 1 from orders o, st
              where o.created_at > r.first_sent
                and o.created_at <= r.first_sent + make_interval(days => st.w)
                and reactivation_key(o.customer_id, o.guest_phone, o.guest_email, o.guest_instagram_handle) = r.customer_key
           ) as booked,
           r.first_sent <= now() - make_interval(days => (select w from st)) as matured
      from rounds r
  )
  select count(*) filter (where booked or matured)::integer,
         count(*) filter (where booked)::integer,
         case when count(*) filter (where booked or matured) = 0 then 0
              else round(count(*) filter (where booked)::numeric / count(*) filter (where booked or matured), 4) end,
         count(*) filter (where not booked and not matured)::integer
    from scored;
$$;

create or replace function reactivation_stats()
returns table (nudged integer, rebooked integer, rate numeric, pending integer,
               ten_week_enabled boolean, ten_week_threshold numeric, ten_week_min_sample integer,
               discount_enabled boolean, welcome_back_pct integer)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then
    raise exception 'staff only' using errcode = '42501';
  end if;
  return query
    select s.nudged, s.rebooked, s.rate, s.pending, st.ten_week_enabled, st.ten_week_threshold, st.ten_week_min_sample,
           st.discount_enabled, st.welcome_back_pct
      from reactivation_stats_internal() s, reactivation_settings st;
end;
$$;

-- Turns the 10-week nudge on once the 5-week one has proven itself. One-way:
-- staff can switch it off again in reactivation_settings.
create or replace function reactivation_check_ten_week()
returns boolean language plpgsql security definer set search_path = public as $$
declare
  st reactivation_settings%rowtype;
  s record;
begin
  select * into st from reactivation_settings;
  if st.ten_week_enabled then
    return true;
  end if;
  select * into s from reactivation_stats_internal();
  if s.nudged >= st.ten_week_min_sample and s.rate > st.ten_week_threshold then
    update reactivation_settings set ten_week_enabled = true, ten_week_enabled_at = now();
    return true;
  end if;
  return false;
end;
$$;

-- ── due list with stages ──────────────────────────────────────────────
drop function customers_due_for_clean();

create or replace function reactivation_due_all()
returns table (
  customer_key text, customer_id uuid, guest_key text, name text, phone text, email text,
  last_service text, service_label text, last_order_number text, completed_at timestamptz,
  days_since integer, source text, has_push boolean, stage text
)
language sql stable security definer set search_path = public as $$
  select c.*, '5wk'::text from reactivation_candidates(35, 60) c
  union all
  select c.*, '10wk'::text from reactivation_candidates(70, 90) c
   where (select ten_week_enabled from reactivation_settings)
  order by 11 desc, 4;
$$;

create or replace function customers_due_for_clean()
returns table (
  customer_key text, customer_id uuid, guest_key text, name text, phone text, email text,
  last_service text, service_label text, last_order_number text, completed_at timestamptz,
  days_since integer, source text, has_push boolean, stage text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then
    raise exception 'staff only' using errcode = '42501';
  end if;
  return query select * from reactivation_due_all();
end;
$$;

-- Daily job: check the 10-week rule, then push everyone due (both stages).
create or replace function send_reactivation_pushes()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  sent integer := 0;
  st reactivation_settings%rowtype;
  msg text;
begin
  perform reactivation_check_ten_week();
  select * into st from reactivation_settings;
  msg := 'Your kicks are due a clean 👟 Book again and keep them fresh.';
  if st.discount_enabled and st.welcome_back_pct > 0 then
    msg := msg || ' Take ' || st.welcome_back_pct || '% off with WELCOMEBACK' || st.welcome_back_pct || ' this week.';
  end if;
  for r in
    select * from reactivation_due_all() c where c.customer_id is not null and c.has_push
  loop
    insert into notifications (customer_id, type, title, body)
    values (r.customer_id, 'promo', 'Due for a clean', msg);
    insert into reactivation_nudges (customer_key, customer_id, channel, stage)
    values (r.customer_key, r.customer_id, 'push', r.stage);
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;

-- ── grants ────────────────────────────────────────────────────────────
revoke all on function apply_welcome_back() from public, anon, authenticated;
revoke all on function reactivation_stats_internal() from public, anon, authenticated;
revoke all on function reactivation_check_ten_week() from public, anon, authenticated;
revoke all on function reactivation_due_all() from public, anon, authenticated;
revoke all on function send_reactivation_pushes() from public, anon, authenticated;
revoke all on function reactivation_stats() from public, anon;
revoke all on function customers_due_for_clean() from public, anon;
grant execute on function reactivation_stats() to authenticated;
grant execute on function customers_due_for_clean() to authenticated;
