\set ON_ERROR_STOP 1
\i supabase/seed.sql
create or replace function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin if not coalesce(cond,false) then raise exception 'FAIL: %', what; end if; raise notice 'PASS: %', what; end $$;
insert into auth.users(id,email,email_confirmed_at) values ('00000000-0000-0000-0000-0000000000a1','ana@x.com',now()),('00000000-0000-0000-0000-0000000000b1','bob@x.com',now());
insert into customers(id,name,email) values ('00000000-0000-0000-0000-0000000000a1','Ana','ana@x.com'),('00000000-0000-0000-0000-0000000000b1','Bob','bob@x.com');
insert into push_tokens(customer_id, token, platform) select id, 'ExponentPushToken['||name||']', 'ios' from customers;
-- both completed ~40 days ago
insert into orders(customer_id,service_id,item_name,status,scheduled_date,price_cents,source,created_at)
select c, id, 'AF1s', 'completed', current_date-40, price_cents, 'creppie', now()-interval '40 days' from services, (values ('00000000-0000-0000-0000-0000000000a1'::uuid),('00000000-0000-0000-0000-0000000000b1'::uuid)) v(c) where name='Sneaker Clean';
update order_status_events set created_at = now()-interval '39 days';
insert into order_status_events(order_id,status,created_at) select id,'completed',now()-interval '39 days' from orders;
update pairs set brand='Nike', model='Air Force 1';
-- Ana is a smart-nudges tester; Bob isn't
insert into feature_flag_users(flag_key,user_id) values ('smart_nudges','00000000-0000-0000-0000-0000000000a1');
select send_reactivation_pushes();
select pg_temp.ok((select body from notifications where customer_id='00000000-0000-0000-0000-0000000000a1' and title='Due for a clean') like 'Your Nike Air Force 1 are due%', 'tester gets pair-named nudge');
select pg_temp.ok((select body from notifications where customer_id='00000000-0000-0000-0000-0000000000b1' and title='Due for a clean') like 'Your kicks are due%', 'non-tester keeps generic nudge');

-- ready waiting 4 days (Ana) -> one nudge, not twice
insert into orders(customer_id,service_id,item_name,status,scheduled_date,price_cents,source,created_at)
select '00000000-0000-0000-0000-0000000000a1', id, 'Jordan 4', 'ready_for_pickup', current_date-5, price_cents, 'creppie', now()-interval '5 days' from services where name='Sneaker Clean';
update order_status_events set created_at = now()-interval '4 days' where order_id=(select id from orders where item_name='Jordan 4');
-- membership with 3 credits ending in 5 days (cap 1) -> nudge "2 expire"
update membership_plans set active=true where slug='fresh';
insert into memberships(customer_id, plan_id, status, current_period_start, current_period_end)
select '00000000-0000-0000-0000-0000000000a1', id, 'active', jm_today()-25, jm_today()+5 from membership_plans where slug='fresh';
insert into membership_credit_ledger(membership_id, delta, reason) select id, 3, 'grant' from memberships;
select pg_temp.ok(smart_nudges_daily()=2, 'daily: credits + ready nudges sent');
select pg_temp.ok(smart_nudges_daily()=0, 'no repeats next day');
select pg_temp.ok((select body from notifications where title='Use your care credits') like 'You have 3 care credits. 2 expire on%', 'credits copy');
select pg_temp.ok((select body from notifications where title='Still waiting for you') like 'Your Jordan 4 are clean%', 'ready copy uses pair name');
