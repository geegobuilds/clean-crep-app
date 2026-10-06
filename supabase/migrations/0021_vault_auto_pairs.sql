-- 0021 — Phase 1 (docs/VISION.md): every order lands in the owner's Vault.
--
-- New orders get a pair automatically: the same customer + the same item name
-- ("AF1s", "1x Clarks Cleaning" -> "Clarks") is the same pair, so repeat
-- cleans build one pair's history. Guests (website / Creppie) own pairs by
-- their guest key until they make an account; claiming the orders claims the
-- pairs. Existing orders are backfilled. Still hidden behind the vault /
-- passport flags (0020): nothing here shows until a flag is on.

-- "2x AF1s" -> "AF1s", "1x Clarks Cleaning" -> "Clarks", "" -> 'Sneakers'.
create or replace function vault_pair_label(p_item text, p_category text)
returns text language sql immutable set search_path = public as $$
  select coalesce(
    nullif(
      trim(regexp_replace(regexp_replace(coalesce(p_item, ''), '^\s*\d+\s*x\s*', '', 'i'),
                          '\s*(deep\s+)?(clean|cleaning|refresh)\s*$', '', 'i')),
      ''),
    case p_category when 'clarks' then 'Clarks' when 'cap' then 'Cap' else 'Sneakers' end);
$$;

create or replace function vault_category(p_item text, p_service text)
returns text language sql immutable set search_path = public as $$
  select case
    when coalesce(p_item, '') || ' ' || coalesce(p_service, '') ~* 'clarks|wallabee|desert boot' then 'clarks'
    when coalesce(p_item, '') || ' ' || coalesce(p_service, '') ~* '\mcaps?\M|\mhats?\M' then 'cap'
    else 'sneaker'
  end;
$$;

-- Find or create the pair an order belongs to. Owner = the order's account,
-- else its raw guest key (deliberately NOT matched to an account by phone, so
-- a booking with someone else's number can't put a pair in their Vault).
create or replace function vault_pair_for_order(
  p_customer_id uuid, p_phone text, p_email text, p_instagram text, p_item text, p_service_id uuid
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_service text;
  v_category text;
  v_label text;
  v_guest text;
  v_pair uuid;
begin
  select name into v_service from services where id = p_service_id;
  v_category := vault_category(p_item, v_service);
  v_label := vault_pair_label(p_item, v_category);
  if p_customer_id is null then
    v_guest := coalesce('phone:' || normalize_jm_phone(p_phone),
                        'email:' || nullif(lower(trim(p_email)), ''),
                        'ig:' || nullif(lower(trim(both '@ ' from p_instagram)), ''));
    if v_guest is null then
      return null;
    end if;
  end if;

  select id into v_pair
    from pairs
   where (case when p_customer_id is not null then customer_id = p_customer_id
               else customer_id is null and guest_key = v_guest end)
     and category = v_category
     and lower(nickname) = lower(v_label)
   order by created_at
   limit 1;
  if v_pair is null then
    insert into pairs (customer_id, guest_key, category, nickname, created_by)
    values (p_customer_id, case when p_customer_id is null then v_guest end, v_category, v_label, null)
    returning id into v_pair;
  end if;
  return v_pair;
end;
$$;

-- Runs last among the BEFORE INSERT triggers (name order). A customer can't
-- point their order at someone else's pair; staff can pick any pair.
create or replace function orders_attach_pair()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.pair_id is not null and not is_staff() then
    if not exists (select 1 from pairs p where p.id = new.pair_id and p.customer_id = new.customer_id) then
      new.pair_id := null;
    end if;
  end if;
  if new.pair_id is null then
    new.pair_id := vault_pair_for_order(new.customer_id, new.guest_phone, new.guest_email,
                                        new.guest_instagram_handle, new.item_name, new.service_id);
  end if;
  return new;
end;
$$;

create trigger orders_zzz_attach_pair
  before insert on orders
  for each row execute function orders_attach_pair();

-- When guest orders are claimed by an account (claim_guest_orders /
-- claim_my_guest_orders), their guest-owned pairs move with them once every
-- order on the pair belongs to that account.
create or replace function orders_claim_pair()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.pair_id is not null and old.customer_id is null and new.customer_id is not null then
    update pairs p
       set customer_id = new.customer_id, guest_key = null
     where p.id = new.pair_id
       and p.customer_id is null
       and not exists (select 1 from orders o where o.pair_id = p.id and o.customer_id is distinct from new.customer_id);
  end if;
  return new;
end;
$$;

create trigger orders_claim_pair
  after update of customer_id on orders
  for each row execute function orders_claim_pair();

-- Backfill: oldest first, so a pair's created_at is its first clean. Leave
-- updated_at alone (it drives "stale order" checks).
alter table orders disable trigger orders_set_updated_at;
do $$
declare r record;
begin
  for r in select * from orders where pair_id is null order by created_at loop
    update orders
       set pair_id = vault_pair_for_order(r.customer_id, r.guest_phone, r.guest_email, r.guest_instagram_handle, r.item_name, r.service_id)
     where id = r.id;
  end loop;
end;
$$;
alter table orders enable trigger orders_set_updated_at;

-- Backdate each pair to its first order.
update pairs p
   set created_at = f.first_at
  from (select pair_id, min(created_at) as first_at from orders where pair_id is not null group by pair_id) f
 where f.pair_id = p.id and f.first_at < p.created_at;

revoke all on function vault_pair_for_order(uuid, text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function orders_attach_pair() from public, anon, authenticated;
revoke all on function orders_claim_pair() from public, anon, authenticated;
