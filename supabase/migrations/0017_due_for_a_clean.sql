-- "Due for a clean" reactivation loop.
--
-- About 5 weeks after a customer's last order is picked up (status
-- 'completed' — the app's "Collected"), bring them back without anyone
-- chasing:
--   * customers_due_for_clean()  staff-only list for the dashboard page
--                                (WhatsApp / email buttons, one row per person)
--   * reactivation_nudges        log of every nudge, so nobody is nudged twice
--                                within 30 days
--   * a daily 9:00 AM Jamaica pg_cron job that pushes "Your kicks are due a
--     clean" to due app customers with a push token (via the 0005 pg_net path:
--     inserting a notification is what sends the push).
--
-- One person = one row across app, website and Creppie: an order's identity is
-- its account, else an account with the same phone/email, else the guest's
-- phone, email or Instagram handle (reactivation_key()).

create extension if not exists pg_cron;

-- ── identity helpers (internal) ───────────────────────────────────────
-- 876-555-0100 / +1 (876) 555 0100 / 5550100 -> 8765550100
create or replace function normalize_jm_phone(p text)
returns text language sql immutable set search_path = public as $$
  select case
    when d = '' then null
    when length(d) = 11 and left(d, 1) = '1' then substr(d, 2)
    when length(d) = 7 then '876' || d
    else d
  end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x;
$$;

create or replace function reactivation_key(p_customer_id uuid, p_phone text, p_email text, p_instagram text)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    p_customer_id::text,
    (select c.id::text from customers c
      where normalize_jm_phone(p_phone) is not null and normalize_jm_phone(c.phone) = normalize_jm_phone(p_phone)
      order by c.created_at limit 1),
    (select c.id::text from customers c
      where nullif(trim(p_email), '') is not null and lower(c.email) = lower(trim(p_email))
      order by c.created_at limit 1),
    'phone:' || normalize_jm_phone(p_phone),
    'email:' || nullif(lower(trim(p_email)), ''),
    'ig:' || nullif(lower(trim(both '@ ' from p_instagram)), '')
  );
$$;

-- "1x Clarks Cleaning" -> "Clarks", "2x AF1s" -> "AF1s", "Sneaker Clean" -> "sneakers"
-- (what goes after "since we cleaned your ...").
create or replace function reactivation_service_label(p_item text, p_service text)
returns text language sql immutable set search_path = public as $$
  select case when lbl = '' or lbl ~* '^sneakers?$' then 'sneakers' else lbl end
  from (
    select trim(regexp_replace(
             regexp_replace(coalesce(nullif(trim(p_item), ''), p_service, ''), '^\s*\d+\s*x\s+', '', 'i'),
             '\s*(deep\s+)?clean(ing)?$', '', 'i')) as lbl
  ) x;
$$;

-- ── nudge log ─────────────────────────────────────────────────────────
create table reactivation_nudges (
  id bigint generated always as identity primary key,
  customer_key text not null,                      -- reactivation_key(): account id or guest key
  customer_id uuid references customers (id) on delete cascade,
  channel text not null check (channel in ('push', 'whatsapp', 'email')),
  sent_at timestamptz not null default now(),
  sent_by uuid references auth.users (id) on delete set null default auth.uid()
);

create index reactivation_nudges_key_sent_idx on reactivation_nudges (customer_key, sent_at desc);

alter table reactivation_nudges enable row level security;

-- Staff only. No update/delete: it's a log.
create policy "reactivation_nudges_select_staff" on reactivation_nudges
  for select using (is_staff());
create policy "reactivation_nudges_insert_staff" on reactivation_nudges
  for insert with check (is_staff());

-- ── who is due ────────────────────────────────────────────────────────
-- Internal: latest order per person was completed p_min..p_max days ago
-- (Jamaica calendar days), no open order, not nudged in the last 30 days.
create or replace function reactivation_candidates(p_min_days integer default 35, p_max_days integer default 60)
returns table (
  customer_key text,
  customer_id uuid,
  guest_key text,
  name text,
  phone text,
  email text,
  last_service text,
  service_label text,
  last_order_number text,
  completed_at timestamptz,
  days_since integer,
  source text,
  has_push boolean
)
language sql stable security definer set search_path = public as $$
  with keyed as (
    select o.*, reactivation_key(o.customer_id, o.guest_phone, o.guest_email, o.guest_instagram_handle) as k
      from orders o
  ),
  latest as (
    select distinct on (k) * from keyed where k is not null order by k, created_at desc
  ),
  done as (
    select l.*,
           coalesce((select max(e.created_at) from order_status_events e
                      where e.order_id = l.id and e.status = 'completed'), l.updated_at) as done_at
      from latest l
     where l.status = 'completed'
  )
  select d.k,
         c.id,
         case when c.id is null then d.k end,
         coalesce(nullif(trim(c.name), ''), nullif(trim(d.guest_name), ''), 'there'),
         coalesce(nullif(trim(c.phone), ''),
                  (select x.guest_phone from keyed x where x.k = d.k and nullif(trim(x.guest_phone), '') is not null
                    order by x.created_at desc limit 1)),
         coalesce(nullif(trim(c.email), ''),
                  (select x.guest_email from keyed x where x.k = d.k and nullif(trim(x.guest_email), '') is not null
                    order by x.created_at desc limit 1)),
         coalesce(s.name, d.item_name),
         reactivation_service_label(d.item_name, s.name),
         d.order_number,
         d.done_at,
         (jm_today() - (d.done_at at time zone 'America/Jamaica')::date)::integer,
         d.source,
         exists (select 1 from push_tokens t where t.customer_id = c.id)
    from done d
    left join customers c on c.id::text = d.k
    left join services s on s.id = d.service_id
   where (jm_today() - (d.done_at at time zone 'America/Jamaica')::date) between p_min_days and p_max_days
     and not exists (select 1 from keyed x where x.k = d.k and x.status <> 'completed')
     and not exists (select 1 from reactivation_nudges n
                      where n.customer_key = d.k and n.sent_at > now() - interval '30 days')
   order by 11 desc, 4;
$$;

-- Staff-facing RPC (the dashboard's "Due for a clean" page).
create or replace function customers_due_for_clean()
returns table (
  customer_key text,
  customer_id uuid,
  guest_key text,
  name text,
  phone text,
  email text,
  last_service text,
  service_label text,
  last_order_number text,
  completed_at timestamptz,
  days_since integer,
  source text,
  has_push boolean
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then
    raise exception 'staff only' using errcode = '42501';
  end if;
  return query select * from reactivation_candidates(35, 60);
end;
$$;

-- ── daily push ────────────────────────────────────────────────────────
-- Inserting the notification is what sends the push (0005's trigger), and it
-- also lands in the app's Inbox. Logged per person so tomorrow's run skips them.
create or replace function send_reactivation_pushes()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  sent integer := 0;
begin
  for r in
    select * from reactivation_candidates(35, 60) c where c.customer_id is not null and c.has_push
  loop
    insert into notifications (customer_id, type, title, body)
    values (r.customer_id, 'promo', 'Due for a clean', 'Your kicks are due a clean 👟 Book again and keep them fresh.');
    insert into reactivation_nudges (customer_key, customer_id, channel)
    values (r.customer_key, r.customer_id, 'push');
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;

-- A push with no order behind it (this nudge) opens Book, not Orders.
create or replace function push_messages_for_notification(n notifications)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'to', t.token,
    'title', n.title,
    'body', n.body,
    'sound', 'default',
    'priority', 'high',
    'channelId', 'order-updates',         -- Android channel created by the app
    'data', jsonb_build_object('notificationId', n.id, 'orderId', n.order_id,
                               'url', case when n.order_id is null then '/book' else '/orders' end)
  )), '[]'::jsonb)
  from push_tokens t
  where t.customer_id = n.customer_id;
$$;

-- 9:00 AM Jamaica = 14:00 UTC (no daylight saving in Jamaica).
select cron.schedule('reactivation-due-for-a-clean', '0 14 * * *', $$select public.send_reactivation_pushes()$$);

-- ── grants ────────────────────────────────────────────────────────────
revoke all on function normalize_jm_phone(text) from public, anon, authenticated;
revoke all on function reactivation_key(uuid, text, text, text) from public, anon, authenticated;
revoke all on function reactivation_service_label(text, text) from public, anon, authenticated;
revoke all on function reactivation_candidates(integer, integer) from public, anon, authenticated;
revoke all on function send_reactivation_pushes() from public, anon, authenticated;
revoke all on function push_messages_for_notification(notifications) from public, anon, authenticated;
revoke all on function customers_due_for_clean() from public, anon;
grant execute on function customers_due_for_clean() to authenticated;
