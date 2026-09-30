-- Turns the free-text extras Creppie logs on an order ("Deep Clean Upgrade,
-- Sole Refresh Kit") into the same add_ons snapshot app orders carry, so the
-- staff dashboard shows extras for WhatsApp/IG/website bookings too.
-- Case-insensitive, '&' = 'and', and a longer name wins over one it contains
-- ("Sole Refresh Kit" is not also "Sole Refresh"). The delivery fee is never
-- matched (Creppie prices pickup through zones). Used by the n8n Creppie
-- workflow's Sync New Order / Sync Addon steps.
create or replace function match_add_ons(p_text text)
returns jsonb language sql stable set search_path = public as $$
  with t as (select lower(replace(coalesce(p_text, ''), '&', 'and')) as txt),
  c as (
    select a.*, lower(replace(a.name, '&', 'and')) as nm
    from add_ons a where a.active and a.kind <> 'delivery'
  ),
  hits as (
    select c.*, (length(t.txt) - length(replace(t.txt, c.nm, ''))) / length(c.nm) as n
    from c, t
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'name', h.name, 'kind', h.kind, 'price_cents', h.price_cents) order by h.sort_order), '[]'::jsonb)
  from hits h
  where h.n - coalesce((select sum(o.n) from hits o where o.id <> h.id and position(h.nm in o.nm) > 0), 0) > 0;
$$;
