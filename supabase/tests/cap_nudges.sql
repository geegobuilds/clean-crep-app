\set ON_ERROR_STOP 1
\i supabase/seed.sql
create or replace function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin if not coalesce(cond,false) then raise exception 'FAIL: %', what; end if; raise notice 'PASS: %', what; end $$;
insert into services(name, price_cents, note, description, icon, active, sort_order, location_id) select 'Premium Cap Clean', 250000, '24-48 hrs', 'Wool caps', 'pkg', true, 41, location_id from services where not exists (select 1 from services where name='Premium Cap Clean') limit 1;
insert into auth.users(id,email,email_confirmed_at) values ('00000000-0000-0000-0000-0000000000a1','ana@x.com',now()),('00000000-0000-0000-0000-0000000000b1','bob@x.com',now());
insert into customers(id,name,email) values ('00000000-0000-0000-0000-0000000000a1','Ana','ana@x.com'),('00000000-0000-0000-0000-0000000000b1','Bob','bob@x.com');
insert into push_tokens(customer_id, token, platform) select id, 'ExponentPushToken['||name||']', 'ios' from customers;
-- Ana: a cap; Bob: sneakers. Both tester, both completed ~40 days ago.
insert into orders(customer_id,service_id,item_name,status,scheduled_date,price_cents,source,created_at)
select '00000000-0000-0000-0000-0000000000a1', id, 'New Era cap', 'completed', current_date-40, price_cents, 'creppie', now()-interval '40 days' from services where name='Premium Cap Clean';
insert into orders(customer_id,service_id,item_name,status,scheduled_date,price_cents,source,created_at)
select '00000000-0000-0000-0000-0000000000b1', id, 'AF1s', 'completed', current_date-40, price_cents, 'creppie', now()-interval '40 days' from services where name='Sneaker Clean';
update order_status_events set created_at = now()-interval '39 days';
insert into order_status_events(order_id,status,created_at) select id,'completed',now()-interval '39 days' from orders;
select pg_temp.ok((select category from pairs where customer_id='00000000-0000-0000-0000-0000000000a1')='cap', 'cap order makes a cap in the Vault');
update pairs set brand='New Era', model='59FIFTY' where category='cap';
update pairs set brand='Nike', model='Air Force 1' where category='sneaker';
insert into feature_flag_users(flag_key,user_id) select 'smart_nudges', id from customers;
select send_reactivation_pushes();
select pg_temp.ok((select body from notifications where customer_id='00000000-0000-0000-0000-0000000000a1' and title='Due for a clean') like 'Your New Era 59FIFTY is due a clean 🧢 Book again and keep it fresh.%', 'cap: is + 🧢');
select pg_temp.ok((select body from notifications where customer_id='00000000-0000-0000-0000-0000000000b1' and title='Due for a clean') like 'Your Nike Air Force 1 are due a clean 👟%', 'sneakers: are + 👟');
-- cap ready 4 days
insert into orders(customer_id,service_id,item_name,status,scheduled_date,price_cents,source,created_at)
select '00000000-0000-0000-0000-0000000000a1', id, 'Bucket hat', 'ready_for_pickup', current_date-5, price_cents, 'creppie', now()-interval '5 days' from services where name='Premium Cap Clean';
update order_status_events set created_at = now()-interval '4 days' where order_id in (select id from orders where item_name='Bucket hat');
select pg_temp.ok(smart_nudges_daily()=1, 'ready nudge sent');
select pg_temp.ok((select body from notifications where title='Still waiting for you') like 'Your % is clean and waiting%', 'cap ready: is clean');
select body from notifications where title in ('Due for a clean','Still waiting for you') order by title, body;
