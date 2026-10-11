\set ON_ERROR_STOP 1
\i supabase/seed.sql
create or replace function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin if not coalesce(cond,false) then raise exception 'FAIL: %', what; end if; raise notice 'PASS: %', what; end $$;
insert into services(name, price_cents, note, description, icon, active, sort_order, location_id) select 'Premium Cap Clean', 250000, '24-48 hrs', 'Wool caps', 'pkg', true, 41, location_id from services where not exists (select 1 from services where name='Premium Cap Clean') limit 1;
insert into auth.users(id,email,email_confirmed_at) values ('00000000-0000-0000-0000-0000000000a1','g@x.com',now()),('00000000-0000-0000-0000-0000000000b1','b@x.com',now());
insert into customers(id,name,email) values ('00000000-0000-0000-0000-0000000000a1','Geego','g@x.com'),('00000000-0000-0000-0000-0000000000b1','Bob','b@x.com');
-- Geego added his cap by hand
insert into pairs(customer_id, category, brand, model) values ('00000000-0000-0000-0000-0000000000a1','cap','NY','SnapBack');
create or replace function pg_temp.book(cust uuid, item text, svc text) returns uuid language sql as $$
  insert into orders(customer_id, service_id, location_id, item_name, scheduled_date, price_cents)
  select cust, id, location_id, item, current_date, price_cents from services where name = svc limit 1 returning pair_id $$;
select pg_temp.ok(pg_temp.book('00000000-0000-0000-0000-0000000000a1','Premium Cap Clean','Premium Cap Clean') = (select id from pairs where model='SnapBack'), 'service-named cap order -> his only cap');
select pg_temp.ok(pg_temp.book('00000000-0000-0000-0000-0000000000a1','NY SnapBack','Premium Cap Clean') = (select id from pairs where model='SnapBack'), 'brand+model text -> that cap');
select pg_temp.ok(pg_temp.book('00000000-0000-0000-0000-0000000000a1','snapback','Premium Cap Clean') = (select id from pairs where model='SnapBack'), 'model text, any case -> that cap');
select pg_temp.ok((select count(*) from pairs where customer_id='00000000-0000-0000-0000-0000000000a1')=1, 'still one cap');
-- a sneaker order never lands on the cap
select pg_temp.ok(pg_temp.book('00000000-0000-0000-0000-0000000000a1','Sneaker Clean','Sneaker Clean') <> (select id from pairs where model='SnapBack'), 'sneaker order -> new sneaker item');
select pg_temp.ok((select category from pairs where customer_id='00000000-0000-0000-0000-0000000000a1' and category<>'cap')='sneaker', 'it is a sneaker');
-- a named new cap is a new item
select pg_temp.ok(pg_temp.book('00000000-0000-0000-0000-0000000000a1','New Era 59FIFTY','Premium Cap Clean') <> (select id from pairs where model='SnapBack'), 'named different cap -> new item');
-- with two caps, a service-named order cannot guess: new item (the app sends pair_id instead)
select pg_temp.ok((select count(*) from pairs where customer_id='00000000-0000-0000-0000-0000000000a1' and category='cap')=2, 'two caps now');
-- explicit pair_id from the app wins
insert into orders(customer_id, service_id, location_id, item_name, scheduled_date, price_cents, pair_id)
select '00000000-0000-0000-0000-0000000000a1', id, location_id, 'Premium Cap Clean', current_date, price_cents, (select id from pairs where model='SnapBack') from services where name='Premium Cap Clean' limit 1;
select pg_temp.ok((select pair_id from orders order by created_at desc, id limit 1) is not null and (select count(*) from orders where pair_id=(select id from pairs where model='SnapBack'))=4, 'explicit pair_id attaches');
-- someone else's pair_id is ignored
insert into orders(customer_id, service_id, location_id, item_name, scheduled_date, price_cents, pair_id)
select '00000000-0000-0000-0000-0000000000b1', id, location_id, 'Premium Cap Clean', current_date, price_cents, (select id from pairs where model='SnapBack') from services where name='Premium Cap Clean' limit 1;
select pg_temp.ok((select count(*) from orders where pair_id=(select id from pairs where model='SnapBack'))=4, 'other customer cannot attach to his cap');
-- repeat names still group (0021 behaviour)
select pg_temp.ok(pg_temp.book('00000000-0000-0000-0000-0000000000b1','AF1s','Sneaker Clean') = pg_temp.book('00000000-0000-0000-0000-0000000000b1','2x AF1s','Sneaker Clean'), 'AF1s twice -> one pair');
