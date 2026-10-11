\set ON_ERROR_STOP 1
-- seed services etc.
\i supabase/seed.sql
create or replace function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin if not coalesce(cond,false) then raise exception 'FAIL: %', what; end if; raise notice 'PASS: %', what; end $$;

-- people: staff Sam, app customer Ana (with push token), guest Creppie customer by phone
insert into auth.users(id,email) values ('00000000-0000-0000-0000-00000000000a','staff@x.com'),('00000000-0000-0000-0000-0000000000a1','ana@x.com'),('00000000-0000-0000-0000-0000000000b1','bob@x.com');
insert into staff(id,name) values ('00000000-0000-0000-0000-00000000000a','Sam');
insert into customers(id,name,phone,email) values ('00000000-0000-0000-0000-0000000000a1','Ana','876-555-0101','ana@x.com'),('00000000-0000-0000-0000-0000000000b1','Bob','876-555-0202','bob@x.com');
insert into push_tokens(customer_id, token, platform) values ('00000000-0000-0000-0000-0000000000a1','ExponentPushToken[ana]','ios');

-- Ana: completed app order 40 days ago. Guest Gina (Creppie, phone only): completed 45 days ago.
-- Bob: completed 10 days ago (not due).
insert into orders(customer_id,service_id,item_name,status,scheduled_date,price_cents,source,created_at)
select '00000000-0000-0000-0000-0000000000a1', id, 'AF1s','completed', current_date-41, price_cents, 'creppie', now()-interval '41 days' from services where active order by sort_order limit 1;
insert into orders(customer_id,service_id,item_name,status,scheduled_date,price_cents,source,guest_name,guest_phone,created_at)
select null, id, '1x Clarks Cleaning','completed', current_date-46, price_cents, 'creppie','Gina','(876) 555 0303', now()-interval '46 days' from services where active order by sort_order limit 1;
insert into orders(customer_id,service_id,item_name,status,scheduled_date,price_cents,source,created_at)
select '00000000-0000-0000-0000-0000000000b1', id, 'Dunks','completed', current_date-11, price_cents, 'creppie', now()-interval '11 days' from services where active order by sort_order limit 1;
-- push "completed" timestamps back
update order_status_events e set created_at = o.created_at + interval '1 day' from orders o where o.id=e.order_id;
insert into order_status_events(order_id,status,created_at) select id,'completed',created_at+interval '1 day' from orders;

-- staff-only
do $$ begin perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',true);
  begin perform * from customers_due_for_clean(); raise exception 'FAIL: customer could read due list';
  exception when insufficient_privilege then raise notice 'PASS: due list is staff-only'; end; end $$;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
select pg_temp.ok((select count(*) from customers_due_for_clean())=2, 'due list = Ana + Gina, not Bob');
select pg_temp.ok((select service_label from customers_due_for_clean() where name='Gina')='Clarks', 'Gina label is Clarks');
select pg_temp.ok((select customer_key from customers_due_for_clean() where name='Gina')='phone:8765550303', 'guest keyed by normalised phone');
select pg_temp.ok(not (select discount_enabled from reactivation_settings), 'discount switch defaults OFF');
select set_config('request.jwt.claim.sub','',false);

-- daily push (discount off): only Ana (has token); message has no code
select pg_temp.ok(send_reactivation_pushes()=1, 'push sent to Ana only');
select pg_temp.ok((select body from notifications where type='promo') not like '%WELCOMEBACK%', 'push copy has no code while discount is off');
select pg_temp.ok((select count(*) from reactivation_nudges)=1, 'nudge logged');
select pg_temp.ok(send_reactivation_pushes()=0, 'no second push within 30 days');
-- staff logs a WhatsApp nudge for Gina
insert into reactivation_nudges(customer_key, channel) values ('phone:8765550303','whatsapp');

-- discount OFF: nudged customers book at normal price on all 3 paths
create temp table base as select id, price_cents from services where active order by sort_order limit 1;
-- app path (as Ana, source app -> price_app_order prices it)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
insert into orders(customer_id,service_id,item_name,scheduled_date,source,add_ons) select '00000000-0000-0000-0000-0000000000a1', id, 'AF1 again', current_date+1, 'app','[]' from base;
select set_config('request.jwt.claim.sub','',false);
select pg_temp.ok((select price_cents from orders where item_name='AF1 again')=(select price_cents from base), 'OFF: app booking full price');
-- creppie path (direct insert, guest phone in another format)
insert into orders(customer_id,service_id,item_name,scheduled_date,price_cents,source,guest_name,guest_phone) select null,id,'Clarks again',current_date+1,price_cents,'creppie','Gina','8765550303' from base;
select pg_temp.ok((select price_cents from orders where item_name='Clarks again')=(select price_cents from base), 'OFF: Creppie booking full price');
select pg_temp.ok((select count(*) from orders where welcome_back_nudge_id is not null)=0, 'OFF: no order linked to a nudge');
delete from orders where item_name in ('AF1 again','Clarks again');

-- discount ON
update reactivation_settings set discount_enabled = true;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1',false);
insert into orders(customer_id,service_id,item_name,scheduled_date,source,add_ons) select '00000000-0000-0000-0000-0000000000a1', id, 'AF1 again', current_date+1, 'app','[]' from base;
insert into orders(customer_id,service_id,item_name,scheduled_date,source,add_ons) select '00000000-0000-0000-0000-0000000000a1', id, 'AF1 third', current_date+1, 'app','[]' from base;
select set_config('request.jwt.claim.sub','',false);
select pg_temp.ok((select price_cents from orders where item_name='AF1 again')=round((select price_cents from base)*0.9), 'ON: nudged app customer gets 10% off');
select pg_temp.ok((select notes from orders where item_name='AF1 again') like '%WELCOMEBACK10%', 'ON: order notes say WELCOMEBACK10');
select pg_temp.ok((select price_cents from orders where item_name='AF1 third')=(select price_cents from base), 'ON: only once per nudge round');
insert into orders(customer_id,service_id,item_name,scheduled_date,price_cents,source,guest_name,guest_phone) select null,id,'Clarks again',current_date+1,price_cents,'creppie','Gina','876 555 0303' from base;
select pg_temp.ok((select price_cents from orders where item_name='Clarks again')=round((select price_cents from base)*0.9), 'ON: nudged Creppie guest gets 10% off');
-- Bob was never nudged
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',false);
insert into orders(customer_id,service_id,item_name,scheduled_date,source,add_ons) select '00000000-0000-0000-0000-0000000000b1', id, 'Bob again', current_date+1, 'app','[]' from base;
select set_config('request.jwt.claim.sub','',false);
select pg_temp.ok((select price_cents from orders where item_name='Bob again')=(select price_cents from base), 'ON: never-nudged customer pays full price');
-- website path: book_web_order for a nudged guest email
insert into reactivation_nudges(customer_key, channel) values ('phone:8765550404','whatsapp');
select pg_temp.ok((select price_cents from book_web_order((select id from base),1,'Web pair',null,'dropoff',null,(select d from generate_series(current_date+1,current_date+7,'1 day') d where extract(dow from d)<>0 limit 1)::date,'Wendy','8765550404','wendy@x.com',null))=round((select price_cents from base)*0.9), 'ON: nudged website guest gets 10% off via book_web_order');
select pg_temp.ok((select price_cents from book_web_order((select id from base),1,'Web pair2',null,'dropoff',null,(select d from generate_series(current_date+1,current_date+7,'1 day') d where extract(dow from d)<>0 limit 1)::date,'Walt','8765550505','walt@x.com',null))=(select price_cents from base), 'ON: un-nudged website guest pays full price');

-- push copy mentions the code once the discount is on
delete from reactivation_nudges where channel='push'; delete from notifications where type='promo';
delete from orders where item_name in ('AF1 again','AF1 third');
select pg_temp.ok(send_reactivation_pushes()=1, 'ON: push re-sent after window');
select pg_temp.ok((select body from notifications where type='promo') like '%WELCOMEBACK10%', 'ON: push copy mentions WELCOMEBACK10');

-- stats are staff-only and count rebookers
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
select pg_temp.ok((select rebooked from reactivation_stats())>=1, 'stats count a rebook');
select pg_temp.ok((select count(*) from cron.job where jobname='reactivation-due-for-a-clean' and schedule='0 14 * * *')=1, 'daily 9 AM Jamaica job scheduled');
