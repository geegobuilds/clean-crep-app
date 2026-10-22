\set ON_ERROR_STOP 1
\i supabase/seed.sql
create or replace function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin if not coalesce(cond,false) then raise exception 'FAIL: %', what; end if; raise notice 'PASS: %', what; end $$;

insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a1','ana@x.com'), ('00000000-0000-0000-0000-0000000000a2','bo@x.com');
insert into customers(id,name,email) values ('00000000-0000-0000-0000-0000000000a1','Ana','ana@x.com'), ('00000000-0000-0000-0000-0000000000a2','Bo','bo@x.com');
-- Orders by key (g = guest, a = app). svc: S = Sneaker Clean, C = Clarks Clean.
--  e1/e2  same guest phone (+1 vs local format), different names         → duplicates
--  e3/e4  "Chris" twice, different phones                                → different customers
--  e5/e6  blank names, no phones                                         → different customers
--  e7/e8  same name, one without a phone                                 → duplicates
--  a1/a2  Ana twice                                                      → duplicates
--  a3     Bo
--  a4     Ana, Clarks (different service)
--  a5     Ana, completed;  a6 Ana booked 10 days earlier;  a7/a8 Ana, misc guards
create temp table t(k text primary key, id uuid default gen_random_uuid(), svc text, who text, phone text, cust uuid);
insert into t(k, svc, who, phone, cust) values
  ('e1','S','Dwight','+1 (876) 555-1234',null), ('e2','S','D. Brown','876-555-1234',null),
  ('e3','S','Chris','876-111-1111',null), ('e4','S','chris','876-222-2222',null),
  ('e5','S','',null,null), ('e6','S',' ',null,null),
  ('e7','S','Paya','876-333-3333',null), ('e8','S','paya ',null,null),
  ('a1','S',null,null,'00000000-0000-0000-0000-0000000000a1'), ('a2','S',null,null,'00000000-0000-0000-0000-0000000000a1'),
  ('a3','S',null,null,'00000000-0000-0000-0000-0000000000a2'), ('a4','C',null,null,'00000000-0000-0000-0000-0000000000a1'),
  ('a5','S',null,null,'00000000-0000-0000-0000-0000000000a1'), ('a6','S',null,null,'00000000-0000-0000-0000-0000000000a1'),
  ('a7','S',null,null,'00000000-0000-0000-0000-0000000000a1'), ('a8','S',null,null,'00000000-0000-0000-0000-0000000000a1');
insert into orders(id, service_id, location_id, item_name, scheduled_date, price_cents, guest_name, guest_phone, customer_id)
select t.id, s.id, s.location_id, s.name, current_date, coalesce(s.price_cents, 0), t.who, t.phone, t.cust
  from t join services s on s.name = case t.svc when 'S' then 'Sneaker Clean' else 'Clarks Clean' end;
update orders set status = 'completed' where id = (select id from t where k = 'a5');
update orders set created_at = now() - interval '10 days' where id = (select id from t where k = 'a6');

create or replace function pg_temp.n(k text) returns text language sql as $$
  select replace(o.order_number, 'CC-', '') from orders o join t on t.id = o.id where t.k = $1 $$;
create or replace function pg_temp.dup(a text, b text) returns text language sql as $$ select public.staff_bot_command('dup ' || pg_temp.n(a) || ' ' || pg_temp.n(b)) $$;
create or replace function pg_temp.alive(k text) returns boolean language sql as $$ select exists (select 1 from orders o join t on t.id = o.id where t.k = $1) $$;
create temp table nums as select k, pg_temp.n(k) n from t;

-- Input checks.
select pg_temp.ok(public.staff_bot_command('dup ' || pg_temp.n('e2')) like 'Send the duplicate first%', 'needs two numbers');
select pg_temp.ok(pg_temp.dup('e2','e2') like 'Those are the same order%', 'same order twice');
select pg_temp.ok(public.staff_bot_command('dup 9999 ' || pg_temp.n('e1')) like 'CC-9999 not found%', 'unknown duplicate');
select pg_temp.ok(public.staff_delete_duplicate('10054', '53') = 'CC-10054 not found. Nothing deleted.', '5-digit numbers are not cut short');

-- Not the same customer.
select pg_temp.ok(pg_temp.dup('e4','e3') like 'Not deleted:%Different customers%', 'same name, different phones refused');
select pg_temp.ok(pg_temp.dup('e6','e5') like 'Not deleted:%Different customers%', 'blank names never match');
select pg_temp.ok(pg_temp.dup('a3','a1') like 'Not deleted:%Different customers%', 'different app customers refused');
select pg_temp.ok(pg_temp.dup('a1','e1') like 'Not deleted:%Different customers%', 'app customer vs guest refused');

-- Not a second booking of the same job.
select pg_temp.ok(pg_temp.dup('a2','a5') like 'Not deleted:%the one to keep%completed%', 'kept order completed refused');
select pg_temp.ok(pg_temp.dup('a5','a2') like 'Not deleted:%already completed%', 'completed duplicate refused');
select pg_temp.ok(pg_temp.dup('a4','a1') like 'Not deleted:%different services%', 'different service refused');
select pg_temp.ok(pg_temp.dup('a6','a1') like 'Not deleted:%more than 7 days apart%', 'booked 10 days apart refused');

-- Data the delete would lose.
insert into order_photos(order_id, kind, storage_path) select id, 'before', 'a7/before-1.jpg' from t where k = 'a7';
select pg_temp.ok(pg_temp.dup('a7','a1') like 'Not deleted:%has photos%', 'photos refused');
delete from order_photos where order_id = (select id from t where k = 'a7');
insert into pairs(id, customer_id, category, brand, model) values ('00000000-0000-0000-0000-00000000aa01','00000000-0000-0000-0000-0000000000a1','sneaker','Nike','Dunk');
insert into pair_events(pair_id, kind, order_id) select '00000000-0000-0000-0000-00000000aa01', 'grade', id from t where k = 'a7';
select pg_temp.ok(pg_temp.dup('a7','a1') like 'Not deleted:%Vault grades or tags%', 'pair events refused');
delete from pair_events;
update orders set pair_id = '00000000-0000-0000-0000-00000000aa01' where id = (select id from t where k = 'a7');
select pg_temp.ok(pg_temp.dup('a7','a1') like 'Not deleted:%linked to different Vault items%', 'own Vault item refused');
-- Back to the Vault item the app auto-attached to both bookings.
update orders set pair_id = (select pair_id from orders where id = (select id from t where k = 'a1')) where id = (select id from t where k = 'a7');
update orders set credits_used = 1 where id = (select id from t where k = 'a7');
select pg_temp.ok(pg_temp.dup('a7','a1') like 'Not deleted:%Club credit%', 'credit refused');
update orders set credits_used = 0 where id = (select id from t where k = 'a7');
insert into reactivation_nudges(customer_key, customer_id, channel) values ('k', '00000000-0000-0000-0000-0000000000a1', 'push');
update orders set welcome_back_nudge_id = (select max(id) from reactivation_nudges) where id = (select id from t where k = 'a7');
select pg_temp.ok(pg_temp.dup('a7','a1') like 'Not deleted:%welcome-back discount. Delete the other one instead: dup ' || pg_temp.n('a1') || ' ' || pg_temp.n('a7'),
                  'welcome-back order refused, suggests the reverse');
select pg_temp.ok((select count(*) from orders o join t using (id)) = 16, 'all 16 orders still there');

-- Real duplicates: deleted and backed up.
select pg_temp.ok(pg_temp.dup('e2','e1') like '🗑 Deleted CC-%as a duplicate of CC-%', 'same guest phone (+1 format) deleted');
select pg_temp.ok(not pg_temp.alive('e2') and pg_temp.alive('e1'), 'duplicate gone, original kept');
select pg_temp.ok((select order_row->>'id' = (select id::text from t where k = 'e2') and duplicate_of like 'CC-%'
                          and jsonb_array_length(status_events) >= 1 from deleted_orders), 'backup has the order and its status history');
select pg_temp.ok(pg_temp.alive('e1') and public.staff_bot_command('dup ' || (select n from nums where k = 'e2') || ' ' || pg_temp.n('e1')) like '%not found. Nothing deleted.',
                  'second delete is a no-op');
select pg_temp.ok(pg_temp.dup('e8','e7') like '🗑 Deleted%', 'same name, one phone missing: deleted');
select pg_temp.ok(public.staff_bot_command('duplicate ' || pg_temp.n('a2') || ' ' || pg_temp.n('a1')) like '🗑 Deleted%', 'app duplicate deleted ("duplicate" works too)');
select pg_temp.ok(pg_temp.dup('a1','a7') like '🗑 Deleted%', 'reverse of the welcome-back pair is allowed');
select pg_temp.ok((select count(*) from deleted_orders) = 4, '4 backups');

-- Help lists the command; other commands unchanged.
select pg_temp.ok(public.staff_bot_command('help') like '%dup 62 61 – delete 62, a duplicate of 61%', 'help lists dup');
select pg_temp.ok(public.staff_bot_command('start ' || pg_temp.n('e1')) like '✅ CC-% → In progress%', 'start still works');
select pg_temp.ok(public.staff_bot_command('list') like 'Open orders:%Dwight%', 'list still works');

-- Staff-only.
select pg_temp.ok(not has_function_privilege('anon', 'public.staff_delete_duplicate(text,text)', 'EXECUTE')
              and not has_function_privilege('authenticated', 'public.staff_delete_duplicate(text,text)', 'EXECUTE')
              and not has_function_privilege('anon', 'public.staff_bot_command(text)', 'EXECUTE'), 'not callable by app users');
select pg_temp.ok(not has_table_privilege('anon', 'public.deleted_orders', 'SELECT')
              and not has_table_privilege('authenticated', 'public.deleted_orders', 'SELECT'), 'backups not readable by app users');
