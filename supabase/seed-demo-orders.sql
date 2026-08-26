-- Demo data mirroring the prototype's hardcoded orders (Nike Air Force 1,
-- Clarks Originals, Jordan 1 Retro, ...) for local development.
--
-- Not run automatically by `supabase db reset` (unlike seed.sql) because
-- orders.customer_id is a real auth.users foreign key — you need one real
-- customer account to attach these to. To use:
--
--   1. `supabase start`, then sign up a demo customer through the mobile
--      app (or `supabase auth signup` via the CLI / Studio's Auth panel).
--   2. Find that user's id in Studio (Authentication → Users) or via
--      `select id from auth.users;`.
--   3. Replace :'customer_id' below (psql variable) and run, e.g.:
--        psql "$DB_URL" -v customer_id='<uuid-from-step-2>' -f supabase/seed-demo-orders.sql

insert into customers (id, name, phone, email, loyalty_points, member_since)
values (:'customer_id', 'Geego', '876-555-0100', 'geego@email.com', 350, current_date - interval '6 months')
on conflict (id) do update set loyalty_points = excluded.loyalty_points;

with svc as (
  select id, name from services
)
insert into orders (customer_id, service_id, item_name, status, drop_method, scheduled_date, price_cents)
select :'customer_id', svc.id, v.item_name, v.status::order_status, 'dropoff', v.scheduled_date, v.price_cents
from (values
  ('Nike Air Force 1', 'Sneaker Clean', 'in_progress',      current_date + 1, 200000),
  ('Clarks Originals',  'Clarks Clean',  'ready_for_pickup', current_date,     350000),
  ('Jordan 1 Retro',    'Sneaker Clean', 'completed',        current_date - 8, 200000),
  ('Clarks Originals',  'Clarks Clean',  'completed',        current_date - 22, 350000),
  ('Nike Dunk Low',     'Sneaker Clean', 'completed',        current_date - 35, 200000)
) as v(item_name, service_name, status, scheduled_date, price_cents)
join svc on svc.name = v.service_name;
