\set ON_ERROR_STOP 1
\i supabase/seed.sql
create or replace function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin if not coalesce(cond,false) then raise exception 'FAIL: %', what; end if; raise notice 'PASS: %', what; end $$;
insert into auth.users(id,email,email_confirmed_at) values ('00000000-0000-0000-0000-0000000000a1','g@x.com',now());
insert into customers(id,name,email) values ('00000000-0000-0000-0000-0000000000a1','Geego','g@x.com');
insert into orders(id, customer_id, service_id, location_id, item_name, scheduled_date, price_cents)
select '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', id, location_id, 'AF1s', current_date, price_cents from services where name = 'Sneaker Clean';
insert into order_photos(order_id, kind, storage_path) values ('00000000-0000-0000-0000-0000000000c1','cutout','c1/cutout-1.png');
select pg_temp.ok((select count(*) from order_photos where kind = 'cutout') = 1, 'a cutout can be stored');
do $$ begin
  insert into order_photos(order_id, kind, storage_path) values ('00000000-0000-0000-0000-0000000000c1','selfie','c1/x.png');
  raise exception 'FAIL: unknown kind accepted';
exception when check_violation then raise notice 'PASS: unknown kinds still rejected';
end $$;
update orders set status = 'completed' where id = '00000000-0000-0000-0000-0000000000c1';
update feature_flags set enabled_for_all = true where key = 'passport';
select pg_temp.ok(passport((select passport_code from pairs limit 1))->'showcase' = 'null'::jsonb, 'a cutout alone is never a Passport showcase');
