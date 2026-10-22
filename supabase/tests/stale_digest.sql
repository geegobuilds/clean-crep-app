\set ON_ERROR_STOP 1
\i supabase/seed.sql
create or replace function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin if not coalesce(cond,false) then raise exception 'FAIL: %', what; end if; raise notice 'PASS: %', what; end $$;

select pg_temp.ok(public.staff_stale_digest(5) = 'CCJ morning: no open orders 🎉', 'empty: no open orders');

-- Guest orders: o1 in progress 9 days, o2 received today, o3 ready 6 days ago, o4 ready yesterday, o5 completed 20 days.
insert into orders(id, service_id, location_id, item_name, scheduled_date, price_cents, guest_name)
select v.id::uuid, s.id, s.location_id, v.item, current_date - v.age, s.price_cents, v.who
  from services s, (values
    ('00000000-0000-0000-0000-0000000000d1', 'Dunks', 9, 'Dwight', 'in_progress'),
    ('00000000-0000-0000-0000-0000000000d2', 'AF1s', 0, 'Ellian', 'received'),
    ('00000000-0000-0000-0000-0000000000d3', 'Jordans', 8, 'Crissy', 'ready_for_pickup'),
    ('00000000-0000-0000-0000-0000000000d4', 'Clarks', 2, 'Jabaret', 'ready_for_pickup'),
    ('00000000-0000-0000-0000-0000000000d5', 'Vans', 20, 'Old', 'completed')
  ) v(id, item, age, who, st)
 where s.name = 'Sneaker Clean';
-- New orders always start as received; move them to their test status.
update orders o set status = w.st from (values
  ('00000000-0000-0000-0000-0000000000d1'::uuid, 'in_progress'::order_status),
  ('00000000-0000-0000-0000-0000000000d3', 'ready_for_pickup'),
  ('00000000-0000-0000-0000-0000000000d4', 'ready_for_pickup'),
  ('00000000-0000-0000-0000-0000000000d5', 'completed')) w(id, st) where o.id = w.id;
alter table orders disable trigger orders_set_updated_at;
update orders set updated_at = now() - interval '6 days' where id = '00000000-0000-0000-0000-0000000000d3';
update orders set updated_at = now() - interval '1 day' where id = '00000000-0000-0000-0000-0000000000d4';
alter table orders enable trigger orders_set_updated_at;

create temp table d as select public.staff_stale_digest(5) as t;
select pg_temp.ok((select t from d) like 'CCJ morning: 4 open, 2 need attention%', 'header counts open and late');
select pg_temp.ok((select t from d) like '%⚠️ Overdue (5+ days):%Dwight · Dunks (9d, in progress)%', 'in-progress 9d is overdue');
select pg_temp.ok((select t from d) like '%📦 Not collected (5+ days):%Crissy · Jordans (ready 6d)%', 'ready 6d is not collected');
select pg_temp.ok((select t from d) like '%🧽 On track:%Ellian · AF1s%', 'today''s order is on track');
select pg_temp.ok((select t from d) like '%Jabaret · Clarks · ✅ Ready%', 'ready yesterday is on track');
select pg_temp.ok((select t from d) not like '%Old · Vans%', 'completed orders are left out');
select pg_temp.ok(public.staff_stale_digest(10) like 'CCJ morning: 4 open, 0 need attention%', 'threshold is a parameter');
select pg_temp.ok(not has_function_privilege('anon', 'public.staff_stale_digest(int)', 'EXECUTE')
              and not has_function_privilege('authenticated', 'public.staff_stale_digest(int)', 'EXECUTE'), 'not callable by app users');
