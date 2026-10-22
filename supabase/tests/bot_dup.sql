\set ON_ERROR_STOP 1
\i supabase/seed.sql
create or replace function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin if not coalesce(cond,false) then raise exception 'FAIL: %', what; end if; raise notice 'PASS: %', what; end $$;

insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a1','ana@x.com'), ('00000000-0000-0000-0000-0000000000a2','bo@x.com');
insert into customers(id,name,email) values ('00000000-0000-0000-0000-0000000000a1','Ana','ana@x.com'), ('00000000-0000-0000-0000-0000000000a2','Bo','bo@x.com');
-- e1/e2: Dwight twice (guest, phone written differently). e3: Ana. e4: Bo. e5: Ana with a photo.
-- e6: Dwight, completed. e7: Ellian (guest, other phone and name).
insert into orders(id, service_id, location_id, item_name, scheduled_date, price_cents, guest_name, guest_phone, customer_id)
select v.id::uuid, s.id, s.location_id, v.item, current_date, s.price_cents, v.who, v.phone, v.cust::uuid
  from services s, (values
    ('00000000-0000-0000-0000-0000000000e1', 'Clarks', 'Dwight', '876-555-1234', null),
    ('00000000-0000-0000-0000-0000000000e2', 'Clarks', 'dwight ', '(876) 5551234', null),
    ('00000000-0000-0000-0000-0000000000e3', 'Dunks', null, null, '00000000-0000-0000-0000-0000000000a1'),
    ('00000000-0000-0000-0000-0000000000e4', 'Dunks', null, null, '00000000-0000-0000-0000-0000000000a2'),
    ('00000000-0000-0000-0000-0000000000e5', 'Dunks', null, null, '00000000-0000-0000-0000-0000000000a1'),
    ('00000000-0000-0000-0000-0000000000e6', 'Clarks', 'Dwight', '876-555-1234', null),
    ('00000000-0000-0000-0000-0000000000e7', 'AF1s', 'Ellian', '876-555-9999', null)
  ) v(id, item, who, phone, cust)
 where s.name = 'Sneaker Clean';
update orders set status = 'completed' where id = '00000000-0000-0000-0000-0000000000e6';
insert into order_photos(order_id, kind, storage_path) values ('00000000-0000-0000-0000-0000000000e5','before','e5/before-1.jpg');
create or replace function pg_temp.num(o text) returns text language sql as $$ select replace(order_number, 'CC-', '') from orders where id = o::uuid $$;
create temp table n as select pg_temp.num('00000000-0000-0000-0000-0000000000e1') e1, pg_temp.num('00000000-0000-0000-0000-0000000000e2') e2,
  pg_temp.num('00000000-0000-0000-0000-0000000000e3') e3, pg_temp.num('00000000-0000-0000-0000-0000000000e4') e4,
  pg_temp.num('00000000-0000-0000-0000-0000000000e5') e5, pg_temp.num('00000000-0000-0000-0000-0000000000e6') e6,
  pg_temp.num('00000000-0000-0000-0000-0000000000e7') e7;
create or replace function pg_temp.bot(t text) returns text language sql as $$ select public.staff_bot_command(t) $$;
create or replace function pg_temp.alive(o text) returns boolean language sql as $$ select exists (select 1 from orders where id = o::uuid) $$;

-- Refusals: nothing is deleted.
select pg_temp.ok(pg_temp.bot('dup ' || (select e2 from n)) like 'Send the duplicate first%', 'needs two numbers');
select pg_temp.ok(pg_temp.bot('dup ' || (select e2 || ' ' || e2 from n)) like 'Those are the same order%', 'same order twice');
select pg_temp.ok(pg_temp.bot('dup 9999 ' || (select e1 from n)) like 'CC-9999 not found%', 'unknown duplicate');
select pg_temp.ok(pg_temp.bot('dup ' || (select e7 || ' ' || e1 from n)) like 'Not deleted:%Different customers%', 'different guests refused');
select pg_temp.ok(pg_temp.bot('dup ' || (select e4 || ' ' || e3 from n)) like 'Not deleted:%Different customers%', 'different app customers refused');
select pg_temp.ok(pg_temp.bot('dup ' || (select e3 || ' ' || e1 from n)) like 'Not deleted:%Different customers%', 'app customer vs guest refused');
select pg_temp.ok(pg_temp.bot('dup ' || (select e6 || ' ' || e1 from n)) like 'Not deleted:%already completed%', 'completed order refused');
select pg_temp.ok(pg_temp.bot('dup ' || (select e5 || ' ' || e3 from n)) like 'Not deleted:%has photos%', 'order with photos refused');
select pg_temp.ok((select count(*) from orders where id::text like '00000000-0000-0000-0000-0000000000e%') = 7, 'all 7 orders still there');

-- Club credit used: refused.
update orders set credits_used = 1 where id = '00000000-0000-0000-0000-0000000000e2';
select pg_temp.ok(pg_temp.bot('dup ' || (select e2 || ' ' || e1 from n)) like 'Not deleted:%Club credit%', 'credit order refused');
update orders set credits_used = 0 where id = '00000000-0000-0000-0000-0000000000e2';

-- Same guest (phone written differently, name case/space differs): deleted, backed up.
select pg_temp.ok(pg_temp.bot('dup ' || (select e2 || ' ' || e1 from n)) like '🗑 Deleted CC-%as a duplicate of CC-%', 'guest duplicate deleted');
select pg_temp.ok(not pg_temp.alive('00000000-0000-0000-0000-0000000000e2') and pg_temp.alive('00000000-0000-0000-0000-0000000000e1'), 'duplicate gone, original kept');
select pg_temp.ok((select order_row->>'id' = '00000000-0000-0000-0000-0000000000e2' and duplicate_of like 'CC-%' and jsonb_array_length(status_events) >= 1
                     from deleted_orders), 'backup row has the order and its status history');
select pg_temp.ok(pg_temp.bot('dup ' || (select e2 || ' ' || e1 from n)) like '%not found. Nothing deleted.', 'second delete is a no-op');

-- Same app customer: deleted.
update order_photos set order_id = '00000000-0000-0000-0000-0000000000e3' where order_id = '00000000-0000-0000-0000-0000000000e5';
select pg_temp.ok(pg_temp.bot('duplicate ' || (select e5 || ' ' || e3 from n)) like '🗑 Deleted%', 'app duplicate deleted ("duplicate" works too)');

-- Help lists the command; other commands unchanged.
select pg_temp.ok(pg_temp.bot('help') like '%dup 62 61 – delete 62, a duplicate of 61%', 'help lists dup');
select pg_temp.ok(pg_temp.bot('start ' || (select e1 from n)) like '✅ CC-% → In progress%', 'start still works');
select pg_temp.ok(pg_temp.bot('list') like 'Open orders:%Dwight%', 'list still works');

-- Staff-only.
select pg_temp.ok(not has_function_privilege('anon', 'public.staff_delete_duplicate(text,text)', 'EXECUTE')
              and not has_function_privilege('authenticated', 'public.staff_delete_duplicate(text,text)', 'EXECUTE')
              and not has_function_privilege('anon', 'public.staff_bot_command(text)', 'EXECUTE'), 'not callable by app users');
select pg_temp.ok(not has_table_privilege('anon', 'public.deleted_orders', 'SELECT')
              and not has_table_privilege('authenticated', 'public.deleted_orders', 'SELECT'), 'backups not readable by app users');
