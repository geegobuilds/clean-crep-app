-- 0029 — Crep Passport shows the work: the latest before/after.
--
-- The Passport (/p/<code>, behind the QR on a Crep Tag and the link we WhatsApp
-- with a finished order) used to list care history and a photo count. Now
-- passport() also returns the storage paths of the latest finished clean's
-- before and after photos, and anyone may read exactly those files, so the
-- page can show the before/after slider without signing in.
--
-- Still no owner details, and still nothing unless the `passport` flag is on and
-- the item is public (pairs.passport_public). Only photos of COMPLETED orders on
-- public items are readable, and only while the flag is on.

create or replace function passport(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  p pairs%rowtype;
  v_showcase jsonb;
begin
  if not feature_enabled('passport') then
    return null;
  end if;
  select * into p from pairs where passport_code = upper(trim(p_code)) and passport_public;
  if not found then
    return null;
  end if;

  -- The latest finished clean that has an after photo, with its latest before
  -- (if one was taken) and latest after.
  select jsonb_build_object(
           'date', (o.created_at at time zone 'America/Jamaica')::date,
           'service', s.name,
           'before', (select ph.storage_path from order_photos ph where ph.order_id = o.id and ph.kind = 'before' order by ph.created_at desc limit 1),
           'after', (select ph.storage_path from order_photos ph where ph.order_id = o.id and ph.kind = 'after' order by ph.created_at desc limit 1))
    into v_showcase
    from orders o join services s on s.id = o.service_id
   where o.pair_id = p.id
     and o.status = 'completed'
     and exists (select 1 from order_photos ph where ph.order_id = o.id and ph.kind = 'after')
   order by o.created_at desc
   limit 1;

  return jsonb_build_object(
    'code', p.passport_code,
    'category', p.category,
    'brand', p.brand,
    'model', p.model,
    'colorway', p.colorway,
    'since', (p.created_at at time zone 'America/Jamaica')::date,
    'showcase', v_showcase,
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

-- Is this stored photo one a Passport may show? (security definer: the caller
-- can't read orders/pairs, and shouldn't need to.)
create or replace function passport_photo_public(p_path text)
returns boolean language sql stable security definer set search_path = public as $$
  select feature_enabled('passport') and exists (
    select 1
      from order_photos ph
      join orders o on o.id = ph.order_id
      join pairs pr on pr.id = o.pair_id
     where ph.storage_path = p_path
       and o.status = 'completed'
       and pr.passport_public
  );
$$;
revoke all on function passport_photo_public(text) from public;
grant execute on function passport_photo_public(text) to anon, authenticated;

create policy "order_photos_files_read_passport" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'order-photos' and public.passport_photo_public(name));
