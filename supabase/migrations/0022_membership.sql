-- 0022 — Phase 3 (docs/VISION.md): Clean Crep Club, the care membership.
--
-- How it works (tables from 0020):
--   1. A customer picks a plan in the app: join_membership() makes a PENDING
--      membership with a short payment reference.
--   2. They pay by bank transfer / Lynk / cash (WhatsApp us the reference).
--      Staff record it on Staff › Members: record_membership_payment()
--      activates (or renews) the month and grants the plan's care credits.
--      Unused credits roll over up to the plan's rollover_max; the rest expire.
--   3. At booking, "use a care credit" covers the clean: the database takes
--      the service's base price off and logs a -N ledger row. 1 credit = 1
--      clean; services.credit_cost says how many a service takes (Clarks 2).
--   4. Daily job: 3-day renewal reminder; memberships past their period end
--      without a renewal are PAUSED (credits kept, usable again on renewal).
-- Still hidden: plans are inactive and the `membership` flag is off.

alter table services add column credit_cost integer not null default 1 check (credit_cost >= 1);
update services set credit_cost = 2 where name ilike '%clarks%';

alter table memberships add column payment_ref text unique;

alter table orders
  add column redeem_credit boolean not null default false,
  add column membership_id uuid references memberships (id) on delete set null,
  add column credits_used integer not null default 0 check (credits_used >= 0);

create or replace function membership_balance(p_membership_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::integer from membership_credit_ledger where membership_id = p_membership_id;
$$;

-- The live membership that pays for this customer: their own, else one whose
-- household they're in.
create or replace function membership_for_customer(p_customer_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select m.id
    from memberships m
   where m.status in ('pending', 'active', 'paused')
     and (m.customer_id = p_customer_id
          or exists (select 1 from membership_household h where h.membership_id = m.id and h.customer_id = p_customer_id))
   order by (m.customer_id = p_customer_id) desc, m.created_at
   limit 1;
$$;

-- ── customer: join ────────────────────────────────────────────────────
create or replace function join_membership(p_plan_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_plan membership_plans%rowtype;
  v_existing uuid;
  v_id uuid;
begin
  if v_uid is null or not exists (select 1 from customers where id = v_uid) then
    raise exception 'sign in first' using errcode = '42501';
  end if;
  if not feature_enabled('membership') then
    raise exception 'not available' using errcode = '42501';
  end if;
  select * into v_plan from membership_plans where slug = p_plan_slug and (active or is_staff());
  if not found then
    raise exception 'unknown plan' using errcode = 'P0002';
  end if;
  v_existing := membership_for_customer(v_uid);
  if v_existing is not null then
    -- A pending request can switch plans; a live membership stays as it is.
    update memberships set plan_id = v_plan.id where id = v_existing and status = 'pending' and customer_id = v_uid;
    return my_membership();
  end if;
  insert into memberships (customer_id, plan_id, status, payment_ref)
  values (v_uid, v_plan.id, 'pending', 'CC' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5)))
  returning id into v_id;
  return my_membership();
end;
$$;

-- Everything the app's Club screen needs, for the signed-in customer.
create or replace function my_membership()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_id uuid := membership_for_customer(auth.uid());
  m memberships%rowtype;
  p membership_plans%rowtype;
begin
  if v_id is null or not feature_enabled('membership') then
    return null;
  end if;
  select * into m from memberships where id = v_id;
  select * into p from membership_plans where id = m.plan_id;
  return jsonb_build_object(
    'id', m.id,
    'status', m.status,
    'is_owner', m.customer_id = auth.uid(),
    'payment_ref', m.payment_ref,
    'current_period_start', m.current_period_start,
    'current_period_end', m.current_period_end,
    'balance', membership_balance(m.id),
    'plan', jsonb_build_object('slug', p.slug, 'name', p.name, 'price_cents', p.price_cents, 'credits_per_month', p.credits_per_month,
                               'rollover_max', p.rollover_max, 'max_household', p.max_household, 'perks', p.perks),
    'household', coalesce((select jsonb_agg(jsonb_build_object('name', c.name) order by h.added_at)
                             from membership_household h join customers c on c.id = h.customer_id where h.membership_id = m.id), '[]'::jsonb),
    'ledger', coalesce((select jsonb_agg(jsonb_build_object('delta', l.delta, 'reason', l.reason, 'note', l.note, 'created_at', l.created_at) order by l.created_at desc)
                          from (select * from membership_credit_ledger where membership_id = m.id order by created_at desc limit 20) l), '[]'::jsonb)
  );
end;
$$;

-- ── staff: payment → activate / renew ─────────────────────────────────
create or replace function record_membership_payment(p_membership_id uuid, p_amount_cents integer, p_method text, p_reference text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m memberships%rowtype;
  p membership_plans%rowtype;
  v_start date;
  v_balance integer;
begin
  if not is_staff() then
    raise exception 'staff only' using errcode = '42501';
  end if;
  select * into m from memberships where id = p_membership_id for update;
  if not found or m.status = 'cancelled' then
    raise exception 'membership not found' using errcode = 'P0002';
  end if;
  select * into p from membership_plans where id = m.plan_id;

  -- Paying on time extends from the current period; late or first payments start today.
  v_start := case when m.status = 'active' and m.current_period_end >= jm_today() then m.current_period_end + 1 else jm_today() end;

  insert into membership_payments (membership_id, amount_cents, method, reference, period_start)
  values (m.id, p_amount_cents, p_method, nullif(trim(p_reference), ''), v_start);

  v_balance := membership_balance(m.id);
  if v_balance > p.rollover_max then
    insert into membership_credit_ledger (membership_id, delta, reason, note)
    values (m.id, p.rollover_max - v_balance, 'expire', 'Unused credits over the rollover limit');
  end if;
  if p.credits_per_month > 0 then
    insert into membership_credit_ledger (membership_id, delta, reason, note)
    values (m.id, p.credits_per_month, 'grant', to_char(v_start, 'FMMonth YYYY'));
  end if;

  update memberships
     set status = 'active', current_period_start = v_start, current_period_end = (v_start + interval '1 month' - interval '1 day')::date
   where id = m.id;

  insert into notifications (customer_id, type, title, body)
  values (m.customer_id, 'promo', 'Clean Crep Club',
          case when m.status = 'pending' then 'You''re in! ' else 'Renewed. ' end
          || membership_balance(m.id) || ' care credits ready. Book a clean and tap "Use a care credit".');
  return jsonb_build_object('status', 'active', 'balance', membership_balance(m.id), 'period_end', (v_start + interval '1 month' - interval '1 day')::date);
end;
$$;

-- ── booking: redeem a credit ──────────────────────────────────────────
-- BEFORE INSERT, after pricing (orders_price_app_order) and before
-- WELCOMEBACK (orders_zz_welcome_back), by trigger name order.
create or replace function orders_redeem_credit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_mid uuid;
  m memberships%rowtype;
  v_cost integer;
  v_base integer;
begin
  -- Only this trigger sets these.
  new.membership_id := null;
  new.credits_used := 0;
  if not new.redeem_credit or new.customer_id is null or new.price_cents is null then
    new.redeem_credit := false;
    return new;
  end if;
  v_mid := membership_for_customer(new.customer_id);
  select * into m from memberships where id = v_mid for update;
  select credit_cost, price_cents into v_cost, v_base from services where id = new.service_id;
  if v_mid is null or m.status <> 'active' or m.current_period_end < jm_today() or v_base is null
     or membership_balance(m.id) < v_cost then
    new.redeem_credit := false;
    new.notes := concat_ws(' | ', nullif(trim(coalesce(new.notes, '')), ''), 'Club: no care credit used (none available)');
    return new;
  end if;
  new.membership_id := m.id;
  new.credits_used := v_cost;
  new.price_cents := greatest(new.price_cents - v_base, 0);
  new.notes := concat_ws(' | ', nullif(trim(coalesce(new.notes, '')), ''),
                         'Club: ' || v_cost || ' care credit' || case when v_cost = 1 then '' else 's' end || ' used');
  return new;
end;
$$;

create trigger orders_zz_credits
  before insert on orders
  for each row execute function orders_redeem_credit();

create or replace function orders_log_credit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.credits_used > 0 and new.membership_id is not null then
    insert into membership_credit_ledger (membership_id, delta, reason, order_id, note, created_by)
    values (new.membership_id, -new.credits_used, 'redeem', new.id, new.order_number, null);
  end if;
  return new;
end;
$$;

create trigger orders_log_credit
  after insert on orders
  for each row execute function orders_log_credit();

-- ── daily: reminders + pause lapsed ───────────────────────────────────
create or replace function membership_daily()
returns integer language plpgsql security definer set search_path = public as $$
declare
  n integer := 0;
  r record;
begin
  for r in select m.id, m.customer_id, p.name from memberships m join membership_plans p on p.id = m.plan_id
            where m.status = 'active' and m.current_period_end = jm_today() + 3 loop
    insert into notifications (customer_id, type, title, body)
    values (r.customer_id, 'promo', 'Clean Crep Club', 'Your ' || r.name || ' renews in 3 days. WhatsApp us to renew and keep your credits rolling.');
    n := n + 1;
  end loop;
  update memberships set status = 'paused' where status = 'active' and current_period_end < jm_today();
  return n;
end;
$$;

-- 8:30 AM Jamaica = 13:30 UTC.
select cron.schedule('membership-daily', '30 13 * * *', $$select public.membership_daily()$$);

-- ── grants ────────────────────────────────────────────────────────────
revoke all on function membership_balance(uuid) from public, anon, authenticated;
revoke all on function membership_for_customer(uuid) from public, anon, authenticated;
revoke all on function orders_redeem_credit() from public, anon, authenticated;
revoke all on function orders_log_credit() from public, anon, authenticated;
revoke all on function membership_daily() from public, anon, authenticated;
revoke all on function join_membership(text) from public, anon;
revoke all on function my_membership() from public, anon;
revoke all on function record_membership_payment(uuid, integer, text, text) from public, anon;
grant execute on function join_membership(text) to authenticated;
grant execute on function my_membership() to authenticated;
grant execute on function record_membership_payment(uuid, integer, text, text) to authenticated;
