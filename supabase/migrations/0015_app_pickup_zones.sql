-- App pickups priced by CrepRun zone, like the website (0013) and Creppie.
--
-- Until now the app charged a flat J$1,000 "Pickup & Delivery" add-on on any
-- pickup, while Creppie and the website charge the zone's round-trip rate
-- (J$1,500 to J$4,000) and collect on the zone's day. Now an app pickup names
-- its zone: the database adds that zone's rate and sets the date to the zone's
-- next pickup day. The flat add-on is retired.

alter table orders add column zone_id uuid references zones (id) on delete set null;

update add_ons set active = false where slug = 'pickup-delivery';

create or replace function price_app_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested text[];
  base integer;
  extras integer;
  z zones%rowtype;
begin
  if new.source <> 'app' or is_staff() then
    return new;
  end if;

  select coalesce(array_agg(e->>'id'), '{}')
    into requested
    from jsonb_array_elements(case when jsonb_typeof(new.add_ons) = 'array' then new.add_ons else '[]'::jsonb end) e;

  select
    coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'kind', a.kind, 'price_cents', a.price_cents) order by a.sort_order), '[]'::jsonb),
    coalesce(sum(a.price_cents), 0)
    into new.add_ons, extras
    from add_ons a
   where a.active and a.kind in ('addon', 'kit') and a.id::text = any (requested);

  if new.drop_method = 'pickup' then
    select * into z from zones where id = new.zone_id and active;
    if not found then
      raise exception 'Pick your CrepRun area for pickup.' using errcode = 'P0001';
    end if;
    -- CrepRun collects on the zone's day; it shows on the order like an extra.
    new.scheduled_date := next_pickup_date(z.pickup_day);
    new.add_ons := new.add_ons || jsonb_build_array(jsonb_build_object(
      'id', z.id, 'name', 'CrepRun ' || z.name || ' (' || z.pickup_day || ')', 'kind', 'delivery', 'price_cents', z.rate_cents));
    extras := extras + z.rate_cents;
  else
    new.zone_id := null;
  end if;

  select price_cents into base from services where id = new.service_id;
  new.price_cents := case when base is null then null else base + extras end;
  new.status := 'received';
  return new;
end;
$$;

revoke execute on function price_app_order() from public, anon, authenticated;
