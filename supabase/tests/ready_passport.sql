\set ON_ERROR_STOP 1
\i supabase/seed.sql
create or replace function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin if not coalesce(cond,false) then raise exception 'FAIL: %', what; end if; raise notice 'PASS: %', what; end $$;
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a1','ana@x.com');
insert into customers(id,name,email) values ('00000000-0000-0000-0000-0000000000a1','Ana','ana@x.com');
insert into push_tokens(customer_id, token, platform) values ('00000000-0000-0000-0000-0000000000a1','ExponentPushToken[ana]','ios');
insert into pairs(id, customer_id, category, brand, model) values ('00000000-0000-0000-0000-00000000aa01','00000000-0000-0000-0000-0000000000a1','sneaker','Nike','Air Force 1');
-- c1: a Vault item with an after photo. c2: no Vault item.
insert into orders(id, customer_id, service_id, location_id, item_name, scheduled_date, price_cents, pair_id)
select v.id::uuid, '00000000-0000-0000-0000-0000000000a1', s.id, s.location_id, 'AF1s', current_date, s.price_cents, v.pair::uuid
  from services s, (values ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-00000000aa01'), ('00000000-0000-0000-0000-0000000000c2', null)) v(id, pair)
 where s.name = 'Sneaker Clean';
update orders set pair_id = null where id = '00000000-0000-0000-0000-0000000000c2';
insert into order_photos(order_id, kind, storage_path) values ('00000000-0000-0000-0000-0000000000c1','after','c1/after-1.jpg');
create or replace function pg_temp.last(o text) returns notifications language sql as $$ select * from notifications where order_id = o::uuid order by created_at desc, id desc limit 1 $$;
create or replace function pg_temp.url(o text) returns text language sql as $$ select push_messages_for_notification(pg_temp.last(o))->0->'data'->>'url' $$;

-- Passport off: nothing changes.
update feature_flags set enabled_for_all = false where key = 'passport';
update orders set status = 'ready_for_pickup' where id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.ok((pg_temp.last('00000000-0000-0000-0000-0000000000c1')).body = 'Your AF1s is clean and waiting for pickup.', 'flag off: ready copy unchanged');
select pg_temp.ok(pg_temp.url('00000000-0000-0000-0000-0000000000c1') = '/orders', 'flag off: push opens Orders');

-- Passport on, Vault still off (it is live): no link to a screen they can't open.
update feature_flags set enabled_for_all = true where key = 'passport';
update feature_flags set enabled_for_all = false where key = 'vault';
update orders set status = 'in_progress' where id = '00000000-0000-0000-0000-0000000000c1';
update orders set status = 'ready_for_pickup' where id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.ok((pg_temp.last('00000000-0000-0000-0000-0000000000c1')).body = 'Your AF1s is clean and waiting for pickup.', 'vault off: ready copy unchanged');
select pg_temp.ok(pg_temp.url('00000000-0000-0000-0000-0000000000c1') = '/orders', 'vault off: push opens Orders');
-- A Vault tester gets the link.
insert into feature_flag_users(flag_key, user_id) values ('vault', '00000000-0000-0000-0000-0000000000a1');
update orders set status = 'in_progress' where id = '00000000-0000-0000-0000-0000000000c1';
update orders set status = 'ready_for_pickup' where id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.ok((pg_temp.last('00000000-0000-0000-0000-0000000000c1')).body = 'Your AF1s is clean and waiting for pickup. Tap to see the before & after.', 'ready names the before & after');
select pg_temp.ok(pg_temp.url('00000000-0000-0000-0000-0000000000c1') = '/vault?pair=00000000-0000-0000-0000-00000000aa01', 'ready push opens the item in the Vault');
select pg_temp.ok(pg_temp.url('00000000-0000-0000-0000-0000000000c1') is not null and (select count(*) from net.calls) > 0, 'push was sent');
update orders set status = 'completed' where id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.ok((pg_temp.last('00000000-0000-0000-0000-0000000000c1')).body like '%Step clean! Its before & after is saved to its Crep Passport.', 'completed mentions the passport');
select pg_temp.ok(pg_temp.url('00000000-0000-0000-0000-0000000000c1') like '/vault?pair=%', 'completed push opens the Vault item');

-- No Vault item: plain copy, Orders.
update orders set status = 'ready_for_pickup' where id = '00000000-0000-0000-0000-0000000000c2';
select pg_temp.ok((pg_temp.last('00000000-0000-0000-0000-0000000000c2')).body = 'Your AF1s is clean and waiting for pickup.', 'no Vault item: plain ready copy');
select pg_temp.ok(pg_temp.url('00000000-0000-0000-0000-0000000000c2') = '/orders', 'no Vault item: push opens Orders');

-- In progress never links the Vault.
update orders set status = 'in_progress' where id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.ok(pg_temp.url('00000000-0000-0000-0000-0000000000c1') = '/orders', 'in progress opens Orders');

-- No after photo yet: link the Vault, but don't promise a before & after.
delete from order_photos;
update orders set status = 'ready_for_pickup' where id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.ok((pg_temp.last('00000000-0000-0000-0000-0000000000c1')).body = 'Your AF1s is clean and waiting for pickup.', 'no after photo: no before & after promise');
