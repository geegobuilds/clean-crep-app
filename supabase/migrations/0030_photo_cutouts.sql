-- 0030 — Product-shot cutouts.
--
-- When staff add an "after" photo, the dashboard removes the background in the
-- browser (BiRefNet-lite, MIT licence, runs on the staff phone/computer) and
-- saves a transparent PNG next to it as kind 'cutout'. The app uses the cutout
-- as the Vault cover (the product-shot look); before/after stay as they were.
-- Same bucket, same rules: staff upload, customers read only their own.

alter table public.order_photos drop constraint if exists order_photos_kind_check;
alter table public.order_photos add constraint order_photos_kind_check check (kind in ('before', 'after', 'cutout'));

-- The public Passport's "· N photos" counts the customer's before/after shots
-- only, not product-shot cutouts. Same passport() as 0029 otherwise.
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
               'photos', (select count(*) from order_photos ph where ph.order_id = o.id and ph.kind in ('before', 'after')))
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
