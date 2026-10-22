-- CCJ Orders Bot: "dup 54 53" deletes order 54 as a duplicate of order 53.
-- Also brings staff_bot_command (until now applied live only) under version control.
--
-- Guard rails (a duplicate is a second booking of the same job, nothing more):
--   * both orders exist, they're different, and neither is completed
--   * same customer: same app account, or (guests) the same phone; a guest name only
--     counts when one side has no phone, and never when blank
--   * same service, booked within 7 days of each other
--   * the duplicate has no photos, no Vault grades/tags, used no Club credit, isn't the
--     order carrying a welcome-back discount, and isn't linked to a Vault item the kept
--     order doesn't share
-- Both rows are locked first, so two crossed commands can't delete both orders.
-- Before deleting, the order and its status history are copied to deleted_orders.
-- To restore by hand, disable the orders insert triggers first (they re-price, re-apply
-- discounts and send a new "received" notification). Staff-only: no anon/authenticated grants.

create table if not exists deleted_orders (
  id bigint generated always as identity primary key,
  order_number text not null,
  duplicate_of text,
  order_row jsonb not null,
  status_events jsonb not null default '[]',
  deleted_via text not null default 'telegram',
  deleted_at timestamptz not null default now()
);
alter table deleted_orders enable row level security;
revoke all on deleted_orders from anon, authenticated;

create or replace function public.staff_delete_duplicate(p_dup text, p_orig text)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_dup_no text := 'CC-' || (select lpad(n, greatest(4, length(n)), '0') from (select nullif(regexp_replace(coalesce(p_dup, ''), '\D', '', 'g'), '')::bigint::text as n) x);
  v_orig_no text := 'CC-' || (select lpad(n, greatest(4, length(n)), '0') from (select nullif(regexp_replace(coalesce(p_orig, ''), '\D', '', 'g'), '')::bigint::text as n) x);
  d orders;
  o orders;
  v_dup_name text;
  v_orig_name text;
  v_dup_phone text;
  v_orig_phone text;
  v_same boolean;
begin
  if v_dup_no is null or v_orig_no is null then
    return 'Which one is the duplicate, and which one stays? e.g. dup 54 53 (deletes 54, keeps 53)';
  end if;
  if v_dup_no = v_orig_no then
    return 'Those are the same order. e.g. dup 54 53 (deletes 54, keeps 53)';
  end if;

  -- Lock both rows in a fixed order: "dup 54 53" and "dup 53 54" at the same time can't both win.
  perform 1 from orders where order_number in (v_dup_no, v_orig_no) order by id for update;
  select * into d from orders where order_number = v_dup_no;
  if not found then return v_dup_no || ' not found. Nothing deleted.'; end if;
  select * into o from orders where order_number = v_orig_no;
  if not found then return v_orig_no || ' not found. Nothing deleted.'; end if;

  select coalesce(c.name, d.guest_name, '?') into v_dup_name from (select 1) x left join customers c on c.id = d.customer_id;
  select coalesce(c.name, o.guest_name, '?') into v_orig_name from (select 1) x left join customers c on c.id = o.customer_id;

  if d.customer_id is not null or o.customer_id is not null then
    v_same := d.customer_id is not distinct from o.customer_id;
  else
    v_dup_phone := normalize_jm_phone(d.guest_phone);
    v_orig_phone := normalize_jm_phone(o.guest_phone);
    v_same := case
      when v_dup_phone is not null and v_orig_phone is not null then v_dup_phone = v_orig_phone
      else nullif(lower(trim(d.guest_name)), '') = nullif(lower(trim(o.guest_name)), '')
    end;
  end if;
  if not coalesce(v_same, false) then
    return format('Not deleted: %s is %s but %s is %s. Different customers, so it isn''t a duplicate.',
                  v_dup_no, v_dup_name, v_orig_no, v_orig_name);
  end if;
  if d.status = 'completed' then
    return format('Not deleted: %s is already completed.', v_dup_no);
  end if;
  if o.status = 'completed' then
    return format('Not deleted: %s (the one to keep) is completed, so %s isn''t a second booking of it. Check the numbers.', v_orig_no, v_dup_no);
  end if;
  if d.service_id is distinct from o.service_id then
    return format('Not deleted: %s (%s) and %s (%s) are different services.', v_dup_no, left(d.item_name, 28), v_orig_no, left(o.item_name, 28));
  end if;
  if abs(extract(epoch from d.created_at - o.created_at)) > 7 * 86400 then
    return format('Not deleted: %s and %s were booked more than 7 days apart. Check the numbers.', v_dup_no, v_orig_no);
  end if;
  if exists (select 1 from order_photos where order_id = d.id) then
    return format('Not deleted: %s has photos. Check which order is the real one first.', v_dup_no);
  end if;
  if exists (select 1 from pair_events where order_id = d.id) then
    return format('Not deleted: %s has Vault grades or tags. Check which order is the real one first.', v_dup_no);
  end if;
  if d.redeem_credit or coalesce(d.credits_used, 0) > 0
     or exists (select 1 from membership_credit_ledger where order_id = d.id) then
    return format('Not deleted: %s used a Club credit. Sort the credit out in the dashboard first.', v_dup_no);
  end if;
  if d.welcome_back_nudge_id is not null and o.welcome_back_nudge_id is null then
    return format('Not deleted: %s carries the welcome-back discount. Delete the other one instead: dup %s %s',
                  v_dup_no, replace(v_orig_no, 'CC-', ''), replace(v_dup_no, 'CC-', ''));
  end if;
  if d.pair_id is not null and d.pair_id is distinct from o.pair_id then
    return format('Not deleted: %s and %s are linked to different Vault items (their item names differ). This one needs deleting by hand: ask Claude.', v_dup_no, v_orig_no);
  end if;

  insert into deleted_orders (order_number, duplicate_of, order_row, status_events)
  values (d.order_number, o.order_number, to_jsonb(d),
          coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at) from order_status_events e where e.order_id = d.id), '[]'));
  delete from orders where id = d.id;

  return format(E'🗑 Deleted %s (%s · %s) as a duplicate of %s (%s · %s).\nBackup kept in deleted_orders.',
                d.order_number, v_dup_name, left(d.item_name, 28), o.order_number, v_orig_name, left(o.item_name, 28));
end;
$$;

revoke all on function public.staff_delete_duplicate(text, text) from public, anon, authenticated;
grant execute on function public.staff_delete_duplicate(text, text) to service_role;

-- The bot's command router, as live before this migration plus "dup".
create or replace function public.staff_bot_command(p_text text)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_text text := lower(regexp_replace(trim(coalesce(p_text, '')), '\s+', ' ', 'g'));
  v_cmd text := split_part(v_text, ' ', 1);
  v_status order_status;
  v_label text;
  v_nums text[];
  v_num text;
  v_order_number text;
  r record;
  v_out text := '';
begin
  if v_cmd in ('', 'help', '/help', '/start') then
    return E'Commands:\n'
        || E'list – open orders\n'
        || E'start 62 – In Progress\n'
        || E'ready 62 – Ready for Pickup (customer notified)\n'
        || E'done 62 – Completed (+50 points)\n'
        || E'dup 62 61 – delete 62, a duplicate of 61\n'
        || E'62 – order details\n'
        || E'Several at once: done 52 53 54';
  end if;

  if v_cmd in ('list', '/list', 'open') then
    for r in
      select o.order_number, o.status, o.item_name, coalesce(c.name, o.guest_name, '?') as name,
             (current_date - coalesce(o.scheduled_date, o.created_at::date)) as days
        from orders o left join customers c on c.id = o.customer_id
       where o.status <> 'completed'
       order by o.status = 'ready_for_pickup' desc, o.created_at
    loop
      v_out := v_out || format(E'%s · %s · %s · %s%s\n',
        replace(r.order_number, 'CC-', ''),
        case r.status when 'received' then '📥 Received' when 'in_progress' then '🧽 In progress'
                      when 'ready_for_pickup' then '✅ Ready' when 'pending_payment' then '💰 Payment' else r.status::text end,
        r.name, left(r.item_name, 28),
        case when r.days > 0 then format(' (%sd)', r.days) else '' end);
    end loop;
    return case when v_out = '' then 'No open orders 🎉' else E'Open orders:\n' || v_out end;
  end if;

  v_nums := array(select m[1] from regexp_matches(v_text, '(\d{1,6})', 'g') as m);

  if v_cmd in ('dup', 'duplicate', '/dup') then
    if coalesce(array_length(v_nums, 1), 0) <> 2 then
      return 'Send the duplicate first, then the one to keep: dup 54 53 (deletes 54, keeps 53)';
    end if;
    return staff_delete_duplicate(v_nums[1], v_nums[2]);
  end if;

  v_status := case
    when v_cmd in ('start', 'started', 'progress', 'clean', 'cleaning') then 'in_progress'
    when v_cmd in ('ready', 'r') then 'ready_for_pickup'
    when v_cmd in ('done', 'complete', 'completed', 'collected', 'delivered', 'd') then 'completed'
    when v_cmd in ('received', 'reset') then 'received'
  end::order_status;

  -- A bare number shows that order's details.
  if v_status is null then
    if v_text !~ '^(cc-?)?\d{1,6}$' then
      return 'Didn''t get that. Send "help" for commands.';
    end if;
    v_order_number := 'CC-' || lpad(v_nums[1]::int::text, 4, '0');
    select o.order_number, o.status, o.item_name, o.scheduled_date, o.drop_method, o.notes, o.source,
           coalesce(c.name, o.guest_name) as name, coalesce(c.phone, o.guest_phone) as phone,
           o.guest_instagram_handle as ig, o.customer_id is not null as has_app
      into r
      from orders o left join customers c on c.id = o.customer_id
     where o.order_number = v_order_number;
    if not found then
      return v_order_number || ' not found.';
    end if;
    return format(E'%s – %s\n%s\nStatus: %s\nBooked for: %s (%s)\nPhone: %s%s\nSource: %s%s%s',
      r.order_number, coalesce(r.name, '?'), r.item_name, r.status, coalesce(r.scheduled_date::text, '-'), r.drop_method,
      coalesce(r.phone, '-'), case when r.ig is not null then E'\nIG: @' || ltrim(r.ig, '@') else '' end,
      r.source, case when r.has_app then ' (app notified on changes)' else '' end,
      case when coalesce(r.notes, '') <> '' then E'\nNotes: ' || r.notes else '' end);
  end if;

  if coalesce(array_length(v_nums, 1), 0) = 0 then
    return 'Which order? e.g. ' || v_cmd || ' 62';
  end if;

  v_label := case v_status when 'in_progress' then 'In progress' when 'ready_for_pickup' then 'Ready'
                           when 'completed' then 'Completed' else 'Received' end;

  foreach v_num in array v_nums loop
    v_order_number := 'CC-' || lpad(v_num::int::text, 4, '0');
    select o.id, o.status, coalesce(c.name, o.guest_name, '?') as name, o.customer_id is not null as has_app
      into r
      from orders o left join customers c on c.id = o.customer_id
     where o.order_number = v_order_number
     for update of o;
    if not found then
      v_out := v_out || format(E'❓ %s not found\n', v_order_number);
    elsif r.status = v_status then
      v_out := v_out || format(E'• %s (%s) already %s\n', v_order_number, r.name, v_label);
    else
      update orders set status = v_status where id = r.id;
      v_out := v_out || format(E'✅ %s (%s) → %s%s\n', v_order_number, r.name, v_label,
        case when r.has_app then ' · app notified'
             when v_status = 'ready_for_pickup' then ' · guest: message them yourself'
             else '' end);
    end if;
  end loop;
  return rtrim(v_out, E'\n');
end;
$function$;

revoke all on function public.staff_bot_command(text) from public, anon, authenticated;
grant execute on function public.staff_bot_command(text) to service_role;
