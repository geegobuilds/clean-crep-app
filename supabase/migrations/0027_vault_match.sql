-- 0027 — Repeat cleans land on the item already in the Vault (Geego, 2026-10-10).
--
-- An order without a pair_id used to match a Vault item only by nickname, so
-- booking "Premium Cap Clean" for the cap saved as "NY SnapBack" made a second
-- cap. Now (the app sends pair_id when you pick the item; this covers the
-- rest: WhatsApp, Creppie, the website, older app builds):
--   1. the item text matches the nickname, "brand model", or the model;
--   2. an order named only after its service ("Premium Cap Clean", or blank)
--      goes to the owner's only item in that category, if they have exactly one.
-- Otherwise a new item is created, as before.

create or replace function vault_pair_for_order(
  p_customer_id uuid, p_phone text, p_email text, p_instagram text, p_item text, p_service_id uuid
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_service text;
  v_category text;
  v_label text;
  v_guest text;
  v_pair uuid;
  v_generic boolean;
begin
  select name into v_service from services where id = p_service_id;
  v_category := vault_category(p_item, v_service);
  v_label := vault_pair_label(p_item, v_category);
  -- "Premium Cap Clean" -> "Premium Cap": the item is only named after its service.
  v_generic := coalesce(trim(p_item), '') = '' or lower(v_label) = lower(vault_pair_label(v_service, v_category));
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
     and lower(v_label) in (lower(nickname), lower(trim(concat_ws(' ', brand, model))), lower(model))
   order by created_at
   limit 1;

  if v_pair is null and v_generic then
    select (array_agg(id))[1] into v_pair
      from pairs
     where (case when p_customer_id is not null then customer_id = p_customer_id
                 else customer_id is null and guest_key = v_guest end)
       and category = v_category
    having count(*) = 1;
  end if;

  if v_pair is null then
    insert into pairs (customer_id, guest_key, category, nickname, created_by)
    values (p_customer_id, case when p_customer_id is null then v_guest end, v_category, v_label, null)
    returning id into v_pair;
  end if;
  return v_pair;
end;
$$;

revoke all on function vault_pair_for_order(uuid, text, text, text, text, uuid) from public, anon, authenticated;
