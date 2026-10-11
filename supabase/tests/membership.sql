\set ON_ERROR_STOP 1
\i supabase/seed.sql
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
create or replace function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin if not coalesce(cond,false) then raise exception 'FAIL: %', what; end if; raise notice 'PASS: %', what; end $$;
create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', coalesce(uid,''), false); end $$;
insert into auth.users(id,email,email_confirmed_at) values ('00000000-0000-0000-0000-00000000000a','staff@x.com',now()),('00000000-0000-0000-0000-0000000000a1','ana@x.com',now()),('00000000-0000-0000-0000-0000000000b1','bob@x.com',now());
insert into staff(id,name) values ('00000000-0000-0000-0000-00000000000a','Sam');
insert into customers(id,name,email) values ('00000000-0000-0000-0000-0000000000a1','Ana','ana@x.com'),('00000000-0000-0000-0000-0000000000b1','Bob','bob@x.com');
create temp table ids as select (select id from services where name='Sneaker Clean') sneaker, (select price_cents from services where name='Sneaker Clean') price,
  (select d::date from generate_series(jm_today()+1, jm_today()+7, interval '1 day') d where extract(isodow from d) <> 7 limit 1) bday;
grant select on ids to authenticated;

set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
do $$ begin perform join_membership('fresh'); raise exception 'FAIL: joined while hidden';
exception when insufficient_privilege then raise notice 'PASS: cannot join while membership flag is off'; end $$;
select pg_temp.ok(my_membership() is null, 'my_membership null while hidden');
reset role;
insert into feature_flag_users(flag_key,user_id) values ('membership','00000000-0000-0000-0000-0000000000a1');
update membership_plans set active = true where slug = 'fresh';
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.ok((select count(*) from membership_plans)=1, 'tester sees only the offered plan');
do $$ begin perform join_membership('sneakerhead'); raise exception 'FAIL: joined inactive plan';
exception when no_data_found then raise notice 'PASS: cannot join a plan that is not offered'; end $$;
select pg_temp.ok((join_membership('fresh'))->>'status'='pending', 'join -> pending');
select pg_temp.ok((my_membership())->>'payment_ref' ~ '^CC[0-9A-F]{5}$', 'payment reference');
select pg_temp.ok((select count(*) from memberships)=1 and (join_membership('fresh'))->>'status'='pending' and (select count(*) from memberships)=1, 'joining twice does not duplicate');
do $$ begin perform record_membership_payment((select id from memberships), 500000, 'lynk'); raise exception 'FAIL: customer activated';
exception when insufficient_privilege then raise notice 'PASS: customer cannot record payments'; end $$;
-- pending: credit request ignored, full price
insert into orders(customer_id,service_id,item_name,drop_method,scheduled_date,source,add_ons,redeem_credit) select '00000000-0000-0000-0000-0000000000a1', sneaker,'P1','dropoff',bday,'app','[]',true from ids;
reset role;
select pg_temp.ok((select price_cents from orders where item_name='P1')=(select price from ids) and (select credits_used from orders where item_name='P1')=0, 'pending member: no credit, full price');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a'); set role authenticated;
select record_membership_payment((select id from memberships), 500000, 'lynk', 'TX1');
reset role;
select pg_temp.ok((select status from memberships)='active' and membership_balance((select id from memberships))=3, 'payment activates with 3 credits');
select pg_temp.ok((select current_period_end from memberships) = (jm_today() + interval '1 month' - interval '1 day')::date, 'period is one month');
select pg_temp.ok(exists(select 1 from notifications where customer_id='00000000-0000-0000-0000-0000000000a1' and body like 'You''re in!%'), 'customer notified');

set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
insert into orders(customer_id,service_id,item_name,drop_method,scheduled_date,source,add_ons,redeem_credit,credits_used) select '00000000-0000-0000-0000-0000000000a1', sneaker,'P2','dropoff',bday,'app','[]',true,99 from ids;
insert into orders(customer_id,service_id,item_name,drop_method,scheduled_date,source,add_ons) select '00000000-0000-0000-0000-0000000000a1', sneaker,'P3','dropoff',bday,'app','[]' from ids;
select pg_temp.ok((my_membership())->>'balance'='2', 'customer sees balance 2 after one redemption');
reset role;
select pg_temp.ok((select price_cents from orders where item_name='P2')=0 and (select credits_used from orders where item_name='P2')=1, 'credit covers the clean (forged credits_used ignored)');
select pg_temp.ok((select price_cents from orders where item_name='P3')=(select price from ids), 'no credit asked: full price');
select pg_temp.ok((select notes from orders where item_name='P2') like '%Club: 1 care credit used%', 'order note for staff');

-- Bob cannot use Ana's membership; household member can
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
insert into orders(customer_id,service_id,item_name,drop_method,scheduled_date,source,add_ons,redeem_credit) select '00000000-0000-0000-0000-0000000000b1', sneaker,'B1','dropoff',bday,'app','[]',true from ids;
select pg_temp.ok((select count(*) from memberships)=0, 'Bob cannot see Ana''s membership');
reset role;
select pg_temp.ok((select credits_used from orders where item_name='B1')=0, 'non-member credit request ignored');
insert into membership_household(membership_id, customer_id) select id, '00000000-0000-0000-0000-0000000000b1' from memberships;
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
insert into orders(customer_id,service_id,item_name,drop_method,scheduled_date,source,add_ons,redeem_credit) select '00000000-0000-0000-0000-0000000000b1', sneaker,'B2','dropoff',bday,'app','[]',true from ids;
reset role;
select pg_temp.ok((select credits_used from orders where item_name='B2')=1 and membership_balance((select id from memberships))=1, 'household member spends shared credits');

-- run out
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
insert into orders(customer_id,service_id,item_name,drop_method,scheduled_date,source,add_ons,redeem_credit) select '00000000-0000-0000-0000-0000000000a1', sneaker,'P4','dropoff',bday,'app','[]',true from ids;
insert into orders(customer_id,service_id,item_name,drop_method,scheduled_date,source,add_ons,redeem_credit) select '00000000-0000-0000-0000-0000000000a1', sneaker,'P5','dropoff',bday,'app','[]',true from ids;
reset role;
select pg_temp.ok((select credits_used from orders where item_name='P5')=0 and (select price_cents from orders where item_name='P5')=(select price from ids) and membership_balance((select id from memberships))=0, 'out of credits: full price, balance never negative');

-- renewal: 0 left -> +3; then with 3 left, renew -> rollover cap 1 -> expire 2, +3 = 4
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a'); set role authenticated;
select record_membership_payment((select id from memberships), 500000, 'cash');
select record_membership_payment((select id from memberships), 500000, 'cash');
reset role;
select pg_temp.ok(membership_balance((select id from memberships))=4, 'rollover capped at 1 (3 left -> 1 kept + 3 new = 4)');
select pg_temp.ok((select current_period_end from memberships) > jm_today() + 40, 'early renewals extend the period');

-- lapse -> paused; paused can't redeem
update memberships set current_period_end = jm_today() - 1;
select membership_daily();
select pg_temp.ok((select status from memberships)='paused', 'lapsed membership pauses');
set role authenticated; select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
insert into orders(customer_id,service_id,item_name,drop_method,scheduled_date,source,add_ons,redeem_credit) select '00000000-0000-0000-0000-0000000000a1', sneaker,'P6','dropoff',bday,'app','[]',true from ids;
reset role;
select pg_temp.ok((select credits_used from orders where item_name='P6')=0, 'paused membership cannot redeem');
