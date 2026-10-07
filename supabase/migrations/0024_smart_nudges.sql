-- 0024 — Phase 4 (docs/VISION.md): smart nudges. Only for customers who can
-- see the `smart_nudges` feature (staff, testers, or everyone once launched);
-- everyone else keeps today's messages.
--   1. The 9 AM "due for a clean" push names their pair: "Your Nike Air Force 1
--      are due a clean" instead of "Your kicks".
--   2. Club credits about to expire: one push 5 days before the period ends,
--      only when they'd lose credits (balance above the rollover cap).
--   3. Ready for pickup 3+ days: one push so the shelf clears and we get paid.
-- Each nudge is logged so nobody gets the same one twice.

-- feature_enabled() for a given customer (cron has no signed-in user).
create or replace function feature_enabled_for(p_key text, p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select f.enabled_for_all from feature_flags f where f.key = p_key), false)
      or exists (select 1 from feature_flag_users u where u.flag_key = p_key and u.user_id = p_user)
      or (exists (select 1 from feature_flags f where f.key = p_key) and exists (select 1 from staff s where s.id = p_user));
$$;

-- "Nike Air Force 1" / nickname, from the pair on their latest completed order.
create or replace function smart_pair_name(p_customer_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(concat_ws(' ', p.brand, p.model)), ''), nullif(trim(p.nickname), ''))
    from orders o join pairs p on p.id = o.pair_id
   where o.customer_id = p_customer_id and o.status = 'completed'
   order by o.created_at desc
   limit 1;
$$;

create table smart_nudges_log (
  id bigint generated always as identity primary key,
  customer_id uuid not null references customers (id) on delete cascade,
  kind text not null check (kind in ('credits_expiring', 'ready_waiting')),
  ref text not null,
  sent_at timestamptz not null default now(),
  unique (kind, ref)
);
alter table smart_nudges_log enable row level security;
create policy "smart_nudges_log_staff" on smart_nudges_log for select using (is_staff());

-- 1. Same job as 0018, with the pair's name when smart nudges are on.
create or replace function send_reactivation_pushes()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  sent integer := 0;
  st reactivation_settings%rowtype;
  extra text := '';
  pair_name text;
begin
  perform reactivation_check_ten_week();
  select * into st from reactivation_settings;
  if st.discount_enabled and st.welcome_back_pct > 0 then
    extra := ' Take ' || st.welcome_back_pct || '% off with WELCOMEBACK' || st.welcome_back_pct || ' this week.';
  end if;
  for r in
    select * from reactivation_due_all() c where c.customer_id is not null and c.has_push
  loop
    pair_name := case when feature_enabled_for('smart_nudges', r.customer_id) then smart_pair_name(r.customer_id) end;
    insert into notifications (customer_id, type, title, body)
    values (r.customer_id, 'promo', 'Due for a clean',
            case when pair_name is not null
                 then 'Your ' || pair_name || ' are due a clean 👟 Book again and keep them fresh.'
                 else 'Your kicks are due a clean 👟 Book again and keep them fresh.' end || extra);
    insert into reactivation_nudges (customer_key, customer_id, channel, stage)
    values (r.customer_key, r.customer_id, 'push', r.stage);
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;

-- 2 + 3. Daily at 9:15 AM Jamaica.
create or replace function smart_nudges_daily()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  n integer := 0;
  bal integer;
  pair_name text;
begin
  for r in
    select m.id, m.customer_id, m.current_period_end, p.rollover_max, p.name
      from memberships m join membership_plans p on p.id = m.plan_id
     where m.status = 'active' and m.current_period_end = jm_today() + 5
  loop
    bal := membership_balance(r.id);
    continue when bal <= r.rollover_max or not feature_enabled_for('smart_nudges', r.customer_id);
    insert into smart_nudges_log (customer_id, kind, ref) values (r.customer_id, 'credits_expiring', r.id || ':' || r.current_period_end)
      on conflict do nothing;
    continue when not found;
    insert into notifications (customer_id, type, title, body)
    values (r.customer_id, 'promo', 'Use your care credits',
            'You have ' || bal || ' care credits. ' || (bal - r.rollover_max)
            || case when bal - r.rollover_max = 1 then ' expires on ' else ' expire on ' end
            || to_char(r.current_period_end, 'FMDD Mon') || '. Book a clean this week.');
    n := n + 1;
  end loop;

  for r in
    select o.id, o.customer_id, o.item_name
      from orders o
     where o.status = 'ready_for_pickup' and o.customer_id is not null
       and (select max(e.created_at) from order_status_events e where e.order_id = o.id and e.status = 'ready_for_pickup') < now() - interval '3 days'
  loop
    continue when not feature_enabled_for('smart_nudges', r.customer_id);
    insert into smart_nudges_log (customer_id, kind, ref) values (r.customer_id, 'ready_waiting', r.id::text) on conflict do nothing;
    continue when not found;
    pair_name := coalesce((select coalesce(nullif(trim(concat_ws(' ', p.brand, p.model)), ''), p.nickname)
                             from orders o join pairs p on p.id = o.pair_id where o.id = r.id), r.item_name);
    insert into notifications (customer_id, type, title, body)
    values (r.customer_id, 'ready', 'Still waiting for you',
            'Your ' || pair_name || ' are clean and waiting at Shop 19, Pristine Plaza. Swing by this week.');
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- 9:15 AM Jamaica = 14:15 UTC.
select cron.schedule('smart-nudges-daily', '15 14 * * *', $$select public.smart_nudges_daily()$$);

revoke all on function feature_enabled_for(text, uuid) from public, anon, authenticated;
revoke all on function smart_pair_name(uuid) from public, anon, authenticated;
revoke all on function smart_nudges_daily() from public, anon, authenticated;
revoke all on function send_reactivation_pushes() from public, anon, authenticated;
