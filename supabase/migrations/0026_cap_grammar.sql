-- Smart nudges that know a cap is not a pair (Geego, 2026-10-10).
--
-- "Your New Era 59FIFTY are due a clean 👟" read wrong. Caps now get "is"
-- and 🧢 ("keep it fresh"); the ready-and-waiting reminder says "is clean"
-- for a cap. The ready-and-waiting reminder ("swing by the shop") now only
-- goes to drop-off orders: CrepRun brings pickup orders back, so there is
-- nothing to swing by for. Everything else is unchanged from 0024.

create or replace function smart_pair_category(p_customer_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select p.category
    from orders o join pairs p on p.id = o.pair_id
   where o.customer_id = p_customer_id and o.status = 'completed'
   order by o.created_at desc
   limit 1;
$$;

create or replace function send_reactivation_pushes()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  sent integer := 0;
  st reactivation_settings%rowtype;
  extra text := '';
  pair_name text;
  is_cap boolean;
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
    is_cap := pair_name is not null and smart_pair_category(r.customer_id) = 'cap';
    insert into notifications (customer_id, type, title, body)
    values (r.customer_id, 'promo', 'Due for a clean',
            case when is_cap
                 then 'Your ' || pair_name || ' is due a clean 🧢 Book again and keep it fresh.'
                 when pair_name is not null
                 then 'Your ' || pair_name || ' are due a clean 👟 Book again and keep them fresh.'
                 else 'Your kicks are due a clean 👟 Book again and keep them fresh.' end || extra);
    insert into reactivation_nudges (customer_key, customer_id, channel, stage)
    values (r.customer_key, r.customer_id, 'push', r.stage);
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;

create or replace function smart_nudges_daily()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  n integer := 0;
  bal integer;
  pair_name text;
  pair_cat text;
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
     where o.status = 'ready_for_pickup' and o.customer_id is not null and o.drop_method = 'dropoff'
       and (select max(e.created_at) from order_status_events e where e.order_id = o.id and e.status = 'ready_for_pickup') < now() - interval '3 days'
  loop
    continue when not feature_enabled_for('smart_nudges', r.customer_id);
    insert into smart_nudges_log (customer_id, kind, ref) values (r.customer_id, 'ready_waiting', r.id::text) on conflict do nothing;
    continue when not found;
    select coalesce(nullif(trim(concat_ws(' ', p.brand, p.model)), ''), p.nickname), p.category
      into pair_name, pair_cat
      from orders o join pairs p on p.id = o.pair_id where o.id = r.id;
    pair_name := coalesce(pair_name, r.item_name);
    insert into notifications (customer_id, type, title, body)
    values (r.customer_id, 'ready', 'Still waiting for you',
            'Your ' || pair_name
            || case when coalesce(pair_cat = 'cap', pair_name ~* '\mcaps?\M|\mhats?\M') then ' is' else ' are' end
            || ' clean and waiting at Shop 19, Pristine Plaza. Swing by this week.');
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function smart_pair_category(uuid) from public, anon, authenticated;
revoke all on function smart_nudges_daily() from public, anon, authenticated;
revoke all on function send_reactivation_pushes() from public, anon, authenticated;
