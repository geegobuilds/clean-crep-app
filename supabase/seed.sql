-- Runs automatically after `supabase db reset` / `supabase start`.
-- Only seeds data with no auth.users dependency (services). Demo
-- customers/orders are seeded separately, after a real user exists — see
-- supabase/seed-demo-orders.sql.

insert into services (name, price_cents, note, description, icon, popular, active, sort_order) values
  ('Sneaker Clean', 200000, 'JMD', 'Full clean, deodorize, and wipe-down. Looking fresh.', 'pkg', false, true, 1),
  ('Clarks Clean',  350000, 'JMD', 'Deep clean, conditioning and restoration for your Clarks.', 'star', true, true, 2),
  ('Sole Refresh',  null,   'on inspection', 'Sole yellowing, oxidation removal and sole whitening.', 'check', false, true, 3);
