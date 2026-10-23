-- Sole Refresh Cream (Geego, 2026-10-23): a J$2,000 product Creppie sells and
-- logs as an order. It goes in the add_ons catalog as a 'kit' (a Crep Care
-- product, priced once, not per pair), so:
--   • Creppie's Get Live Prices step reads the price from here, not its prompt
--   • match_add_ons('Sole Refresh Cream') returns this row only: the longer
--     name wins over 'Sole Refresh' (the J$1,500 add-on), so the add-on is
--     never matched by mistake
--   • the app and website booking screens offer it as an extra, like the kits
-- Not the Sole Refresh Kit (J$4,000, restocking) and not the Sole Refresh add-on.
insert into add_ons (slug, name, kind, price_cents, description, sort_order) values
  ('sole-refresh-cream', 'Sole Refresh Cream', 'kit', 200000, 'Keeps soles white between cleans. Use at home.', 12)
on conflict (slug) do nothing;
