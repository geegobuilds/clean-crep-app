\set ON_ERROR_STOP 1
\i supabase/seed.sql
create or replace function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin if not coalesce(cond,false) then raise exception 'FAIL: %', what; end if; raise notice 'PASS: %', what; end $$;

select pg_temp.ok(public.staff_stale_digest(5) = 'CCJ morning: no open orders 🎉', 'empty: no open orders');

-- d1 in progress 9 days, d2 received today, d3 ready 6 days ago (drop-off), d4 ready yesterday,
-- d5 completed, d6 payment exactly 5 days (boundary), d7 ready 7 days ago (CrepRun pickup),
-- d8 an app customer's order (name from customers), 3 days.
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a1','ana@x.com');
insert into customers(id,name,email) values ('00000000-0000-0000-0000-0000000000a1','Ana','ana@x.com');
insert into orders(id, service_id, location_id, item_name, scheduled_date, price_cents, guest_name, drop_method, customer_id, zone_id)
select v.id::uuid, s.id, s.location_id, v.item, current_date - v.age, s.price_cents, v.who, v.dm::drop_method, v.cust::uuid,
       case when v.dm = 'pickup' then (select id from zones where active order by sort_order limit 1) end
  from services s, (values
    ('00000000-0000-0000-0000-0000000000d1', 'Dunks', 9, 'Dwight', 'dropoff', null),
    ('00000000-0000-0000-0000-0000000000d2', 'AF1s', 0, 'Ellian', 'dropoff', null),
    ('00000000-0000-0000-0000-0000000000d3', 'Jordans', 8, 'Crissy', 'dropoff', null),
    ('00000000-0000-0000-0000-0000000000d4', 'Clarks', 2, 'Jabaret', 'dropoff', null),
    ('00000000-0000-0000-0000-0000000000d5', 'Vans', 20, 'Old', 'dropoff', null),
    ('00000000-0000-0000-0000-0000000000d6', 'Cap', 5, 'Paya', 'dropoff', null),
    ('00000000-0000-0000-0000-0000000000d7', 'Yeezys', 9, 'Delly', 'pickup', null),
    ('00000000-0000-0000-0000-0000000000d8', 'Sambas', 3, null, 'dropoff', '00000000-0000-0000-0000-0000000000a1')
  ) v(id, item, age, who, dm, cust)
 where s.name = 'Sneaker Clean';
-- New orders always start as received; move them to their test status.
update orders o set status = w.st from (values
  ('00000000-0000-0000-0000-0000000000d1'::uuid, 'in_progress'::order_status),
  ('00000000-0000-0000-0000-0000000000d3', 'ready_for_pickup'),
  ('00000000-0000-0000-0000-0000000000d4', 'ready_for_pickup'),
  ('00000000-0000-0000-0000-0000000000d5', 'completed'),
  ('00000000-0000-0000-0000-0000000000d6', 'pending_payment'),
  ('00000000-0000-0000-0000-0000000000d7', 'ready_for_pickup')) w(id, st) where o.id = w.id;
-- When they became ready (the status trigger logged it just now).
update order_status_events set created_at = now() - interval '6 days'
 where order_id = '00000000-0000-0000-0000-0000000000d3' and status = 'ready_for_pickup';
update order_status_events set created_at = now() - interval '7 days'
 where order_id = '00000000-0000-0000-0000-0000000000d7' and status = 'ready_for_pickup';
update order_status_events set created_at = now() - interval '1 day'
 where order_id = '00000000-0000-0000-0000-0000000000d4' and status = 'ready_for_pickup';
-- A later edit (e.g. a guest claiming the order) must not reset how long it has sat ready.
update orders set notes = 'claimed' where id = '00000000-0000-0000-0000-0000000000d3';

create temp table d as select public.staff_stale_digest(5) as t;
select pg_temp.ok((select t from d) like 'CCJ morning: 7 open, 4 need attention%', 'header counts open and late');
select pg_temp.ok((select t from d) like '%⚠️ Overdue (5+ days):%Dwight · Dunks (9d, in progress)%', 'in-progress 9d is overdue');
select pg_temp.ok((select t from d) like '%⚠️ Overdue%Paya · Cap (5d, payment)%', 'exactly p_days is overdue');
select pg_temp.ok((select t from d) like '%📦 Not collected (5+ days):%Crissy · Jordans (ready 6d)%', 'ready 6d is not collected, despite a later edit');
select pg_temp.ok((select t from d) like '%🚚 Awaiting delivery (5+ days):%Delly · Yeezys (ready 7d)%', 'CrepRun pickup is awaiting delivery');
select pg_temp.ok((select position('Delly' in t) > position('🚚' in t) from d), 'CrepRun pickup is not under not collected');
select pg_temp.ok((select t from d) like '%🧽 On track:%Ellian · AF1s%', 'today''s order is on track');
select pg_temp.ok((select t from d) like '%Ana · Sambas (3d)%', 'app customer named from their account');
select pg_temp.ok((select t from d) like '%Jabaret · Clarks · ✅ Ready%', 'ready yesterday is on track');
select pg_temp.ok((select t from d) not like '%Old · Vans%', 'completed orders are left out');
select pg_temp.ok(public.staff_stale_digest(10) like 'CCJ morning: 7 open, 0 need attention%', 'threshold is a parameter');
select pg_temp.ok(public.staff_stale_digest(null) = (select t from d), 'null threshold falls back to 5');

-- A backlog still fits in one Telegram message (4096 chars).
insert into orders(service_id, location_id, item_name, scheduled_date, price_cents, guest_name)
select s.id, s.location_id, repeat('Very Long Item Name ', 3), current_date - (g % 12), s.price_cents, repeat('Longname', 4) || g
  from services s, generate_series(1, 120) g where s.name = 'Sneaker Clean';
select pg_temp.ok(length(public.staff_stale_digest(5)) <= 4000, 'backlog of 127 fits in a Telegram message');
select pg_temp.ok(public.staff_stale_digest(5) like '%…and % more%', 'long sections say how many more');

select pg_temp.ok(not has_function_privilege('anon', 'public.staff_stale_digest(int)', 'EXECUTE')
              and not has_function_privilege('authenticated', 'public.staff_stale_digest(int)', 'EXECUTE'), 'not callable by app users');
