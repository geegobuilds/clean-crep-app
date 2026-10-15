\set ON_ERROR_STOP 1
\i supabase/seed.sql
create or replace function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin if not coalesce(cond,false) then raise exception 'FAIL: %', what; end if; raise notice 'PASS: %', what; end $$;
insert into auth.users(id,email,email_confirmed_at) values ('00000000-0000-0000-0000-0000000000a1','g@x.com',now());
insert into customers(id,name,email) values ('00000000-0000-0000-0000-0000000000a1','Geego','g@x.com');
insert into pairs(id, customer_id, category, brand, model) values
  ('00000000-0000-0000-0000-00000000aa01','00000000-0000-0000-0000-0000000000a1','sneaker','Nike','Air Force 1'),
  ('00000000-0000-0000-0000-00000000aa02','00000000-0000-0000-0000-0000000000a1','sneaker','Jordan','1 Retro');
update pairs set passport_public = false where id = '00000000-0000-0000-0000-00000000aa02';
-- AF1: an older finished clean, the latest finished clean, and one in progress (all with photos)
insert into orders(id, customer_id, service_id, location_id, item_name, scheduled_date, price_cents, pair_id, created_at)
select v.id::uuid, '00000000-0000-0000-0000-0000000000a1', s.id, s.location_id, 'AF1s', current_date, s.price_cents, v.pair::uuid, now() - (v.age || ' days')::interval
  from services s, (values ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-00000000aa01',40),
                           ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-00000000aa01',6),
                           ('00000000-0000-0000-0000-0000000000c3','00000000-0000-0000-0000-00000000aa01',1),
                           ('00000000-0000-0000-0000-0000000000c4','00000000-0000-0000-0000-00000000aa02',3)) v(id, pair, age)
 where s.name = 'Sneaker Clean';
update orders set status = 'completed' where id in ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000c4');
insert into order_photos(order_id, kind, storage_path, created_at) values
  ('00000000-0000-0000-0000-0000000000c1','after','c1/after-1.jpg', now() - interval '39 days'),
  ('00000000-0000-0000-0000-0000000000c2','before','c2/before-1.jpg', now() - interval '6 days'),
  ('00000000-0000-0000-0000-0000000000c2','after','c2/after-1.jpg', now() - interval '5 days'),
  ('00000000-0000-0000-0000-0000000000c2','after','c2/after-2.jpg', now() - interval '4 days'),
  ('00000000-0000-0000-0000-0000000000c3','before','c3/before-1.jpg', now()),
  ('00000000-0000-0000-0000-0000000000c4','after','c4/after-1.jpg', now());
insert into storage.objects(bucket_id, name) select 'order-photos', storage_path from order_photos;
grant select on storage.objects to anon, authenticated;
select passport_code as af1 from pairs where id = '00000000-0000-0000-0000-00000000aa01' \gset
select passport_code as j1 from pairs where id = '00000000-0000-0000-0000-00000000aa02' \gset

-- Flag off: nothing, not even the photos.
select pg_temp.ok(passport(:'af1') is null, 'flag off: no passport');
select pg_temp.ok(not passport_photo_public('c2/after-2.jpg'), 'flag off: photo not public');
update feature_flags set enabled_for_all = true where key = 'passport';

select pg_temp.ok(passport(:'af1')->'showcase'->>'after' = 'c2/after-2.jpg', 'showcase: latest after of the latest finished clean');
select pg_temp.ok(passport(:'af1')->'showcase'->>'before' = 'c2/before-1.jpg', 'showcase: its before');
select pg_temp.ok(passport(:'af1')->'showcase'->>'service' = 'Sneaker Clean', 'showcase: service name');
select pg_temp.ok(passport(:'j1') is null, 'private item: no passport');
select pg_temp.ok(passport_photo_public('c2/after-2.jpg'), 'finished clean on a public item: photo public');
select pg_temp.ok(not passport_photo_public('c3/before-1.jpg'), 'clean still in progress: photo private');
select pg_temp.ok(not passport_photo_public('c4/after-1.jpg'), 'private item: photo private');
select pg_temp.ok(not passport_photo_public('nope/after.jpg'), 'unknown path: private');

-- Through RLS, as an anonymous visitor (the WhatsApp link opener).
set role anon;
select pg_temp.ok((select count(*) from storage.objects where name = 'c2/after-2.jpg') = 1, 'anon can read the showcased after');
select pg_temp.ok((select count(*) from storage.objects where name in ('c3/before-1.jpg','c4/after-1.jpg')) = 0, 'anon cannot read in-progress or private photos');
reset role;
update feature_flags set enabled_for_all = false where key = 'passport';
set role anon;
select pg_temp.ok((select count(*) from storage.objects) = 0, 'flag off again: anon reads nothing');
reset role;
