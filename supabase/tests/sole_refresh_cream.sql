-- 0034: Sole Refresh Cream is its own catalog product, and match_add_ons keeps
-- it apart from the Sole Refresh add-on and the Sole Refresh Kit.
do $$
declare r jsonb;
begin
  if (select price_cents from add_ons where slug = 'sole-refresh-cream' and kind = 'kit' and active) = 200000
    then raise notice 'PASS: cream is an active J$2000 product';
    else raise exception 'FAIL: cream row missing or wrong'; end if;

  r := match_add_ons('Sole Refresh Cream');
  if jsonb_array_length(r) = 1 and r->0->>'name' = 'Sole Refresh Cream'
    then raise notice 'PASS: cream matches only the cream';
    else raise exception 'FAIL: cream text matched %', r; end if;

  r := match_add_ons('Sneaker Cleaning, Sole Refresh, Sole Refresh Cream');
  if jsonb_array_length(r) = 2
     and r @> '[{"name":"Sole Refresh"}]' and r @> '[{"name":"Sole Refresh Cream"}]'
    then raise notice 'PASS: add-on and cream both counted, once each';
    else raise exception 'FAIL: add-on + cream matched %', r; end if;

  r := match_add_ons('Sole Refresh');
  if jsonb_array_length(r) = 1 and r->0->>'name' = 'Sole Refresh'
    then raise notice 'PASS: plain Sole Refresh is still the add-on';
    else raise exception 'FAIL: Sole Refresh matched %', r; end if;

  r := match_add_ons('Sole Refresh Kit');
  if jsonb_array_length(r) = 1 and r->0->>'name' = 'Sole Refresh Kit'
    then raise notice 'PASS: kit is still the kit';
    else raise exception 'FAIL: kit matched %', r; end if;
end $$;
