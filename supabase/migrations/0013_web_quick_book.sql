-- Quick Book on the website (www.cleancrep.com #book).
--
-- Visitors book without an account: name, phone and email (required, so we
-- can send them a link to create an account). The database prices the order
-- and picks the date, so the page can't book a cheaper clean or a Sunday.
-- When they later create an account with the same, verified email, their web
-- (and Creppie) bookings move onto it and show up in the app's Orders tab.

alter table orders drop constraint orders_source_check;
alter table orders add constraint orders_source_check check (source in ('app', 'creppie', 'web'));

-- Jamaica has no daylight saving: "today" for bookings is America/Jamaica.
create or replace function jm_today()
returns date language sql stable as $$
  select (now() at time zone 'America/Jamaica')::date;
$$;

-- The next CrepRun pickup date for a zone: the zone's weekday, from tomorrow on.
create or replace function next_pickup_date(p_pickup_day text)
returns date language sql stable as $$
  select d::date
    from generate_series(jm_today() + 1, jm_today() + 7, interval '1 day') d
   where trim(to_char(d, 'Day')) ilike trim(p_pickup_day)
   order by d
   limit 1;
$$;

create or replace function book_web_order(
  p_service_id uuid,
  p_pairs integer,
  p_item text,
  p_add_on_ids uuid[],
  p_drop_method drop_method,
  p_zone_id uuid,
  p_date date,
  p_name text,
  p_phone text,
  p_email text,
  p_notes text
)
returns table (order_number text, price_cents integer, scheduled_date date, has_account boolean)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  svc services%rowtype;
  z zones%rowtype;
  v_name text := trim(coalesce(p_name, ''));
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_email text := lower(trim(coalesce(p_email, '')));
  v_item text := left(trim(coalesce(p_item, '')), 120);
  v_notes text := left(trim(coalesce(p_notes, '')), 500);
  v_date date;
  v_extras jsonb;
  v_extras_cents integer;
  v_price integer;
  v_customer uuid;
  v_order orders%rowtype;
  v_parts text[] := '{}';
begin
  -- Who and how many
  if length(v_name) < 2 or length(v_name) > 80 then raise exception 'BOOK: Please enter your name.'; end if;
  if length(regexp_replace(v_phone, '\D', '', 'g')) not between 7 and 15 then raise exception 'BOOK: Please enter a valid phone number.'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then raise exception 'BOOK: Please enter a valid email.'; end if;
  if p_pairs is null or p_pairs not between 1 and 10 then raise exception 'BOOK: 1 to 10 pairs per booking.'; end if;

  -- Abuse guard: a few bookings per contact per day, and a site-wide ceiling.
  if (select count(*) from orders o
       where o.source = 'web' and o.created_at > now() - interval '1 day'
         and (o.guest_phone = v_phone or lower(o.guest_email) = v_email)) >= 3 then
    raise exception 'BOOK: You already have a few bookings today. Link us on WhatsApp to add more.';
  end if;
  if (select count(*) from orders o where o.source = 'web' and o.created_at > now() - interval '1 hour') >= 60 then
    raise exception 'BOOK: Bookings are busy right now. Link us on WhatsApp and we will sort you out.';
  end if;

  select * into svc from services s where s.id = p_service_id and s.active;
  if not found then raise exception 'BOOK: Pick a service.'; end if;

  -- When
  if p_drop_method = 'pickup' then
    select * into z from zones where id = p_zone_id and active;
    if not found then raise exception 'BOOK: Pick your CrepRun zone.'; end if;
    v_date := next_pickup_date(z.pickup_day);
  else
    v_date := p_date;
    if v_date is null or v_date < jm_today() or v_date > jm_today() + 14 or extract(isodow from v_date) = 7 then
      raise exception 'BOOK: Pick a drop-off day (Monday to Saturday, within 2 weeks).';
    end if;
  end if;

  -- What it costs: service and service extras per pair, kits once, CrepRun by zone.
  select
    coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'kind', a.kind, 'price_cents', a.price_cents) order by a.sort_order), '[]'::jsonb),
    coalesce(sum(case when a.kind = 'addon' then a.price_cents * p_pairs else a.price_cents end), 0)
    into v_extras, v_extras_cents
    from add_ons a
   where a.active and a.kind in ('addon', 'kit') and a.id = any (coalesce(p_add_on_ids, '{}'));
  v_price := case when svc.price_cents is null then null
                  else svc.price_cents * p_pairs + v_extras_cents + coalesce(z.rate_cents, 0) end;

  v_parts := v_parts || ('Pairs: ' || p_pairs);
  if p_drop_method = 'pickup' then
    v_parts := v_parts || ('CrepRun ' || z.name || ' (' || z.pickup_day || ', ' || to_char(z.rate_cents / 100, 'FM999,999') || ' JMD round trip)');
  end if;
  if v_notes <> '' then v_parts := v_parts || v_notes; end if;

  -- Booked by someone whose verified account already uses this email: put it on that account.
  select c.id into v_customer
    from customers c join auth.users u on u.id = c.id
   where lower(u.email) = v_email and u.email_confirmed_at is not null
   limit 1;

  insert into orders (customer_id, service_id, item_name, status, drop_method, scheduled_date, notes, price_cents,
                      source, guest_name, guest_phone, guest_email, add_ons)
  values (v_customer, svc.id,
          case when p_pairs > 1 then p_pairs || 'x ' else '' end || coalesce(nullif(v_item, ''), svc.name),
          'received', p_drop_method, v_date, array_to_string(v_parts, ' | '), v_price,
          'web', v_name, v_phone, v_email, v_extras)
  returning * into v_order;

  return query select v_order.order_number, v_order.price_cents, v_order.scheduled_date, v_customer is not null;
end;
$$;

revoke execute on function book_web_order(uuid, integer, text, uuid[], drop_method, uuid, date, text, text, text, text) from public;
grant execute on function book_web_order(uuid, integer, text, uuid[], drop_method, uuid, date, text, text, text, text) to anon, authenticated;

-- A new account claims the guest bookings made with its email (website or
-- Creppie), but only once that email is verified, so nobody can sign up with
-- someone else's address and see their orders.
create or replace function claim_guest_orders()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update orders o
     set customer_id = new.id
    from auth.users u
   where u.id = new.id
     and u.email_confirmed_at is not null
     and o.customer_id is null
     and o.guest_email is not null
     and lower(o.guest_email) = lower(u.email);
  return new;
end;
$$;

revoke execute on function claim_guest_orders() from public, anon, authenticated;

create trigger customers_claim_guest_orders
  after insert on customers
  for each row execute function claim_guest_orders();
