-- Morning digest for the CCJ Orders Bot (n8n "CCJ Stale Orders Alert", 07:00 Jamaica).
-- Lists every open order, overdue ones first, so a stuck order surfaces within a day.
--   Overdue:            received / in progress / payment, p_days+ since booked-for date
--   Not collected:      ready (drop-off), p_days+ since it became ready
--   Awaiting delivery:  ready (CrepRun pickup), p_days+ since it became ready
-- "Became ready" comes from order_status_events, not updated_at (any edit, e.g. a guest
-- claiming the order, bumps updated_at). Dates are Jamaica dates. Read-only.
-- Staff-only: no anon/authenticated grant. Stays under Telegram's 4096-char limit.

create or replace function public.staff_stale_digest(p_days int default 5)
returns text
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  c_max_len constant int := 3800;
  c_max_lines constant int := 25;
  v_days int := coalesce(p_days, 5);
  v_today date := (now() at time zone 'America/Jamaica')::date;
  r record;
  v_overdue text := '';
  v_pickup text := '';
  v_delivery text := '';
  v_bench text := '';
  v_n_overdue int := 0;
  v_n_pickup int := 0;
  v_n_delivery int := 0;
  v_n_bench int := 0;
  v_open int := 0;
  v_line text;
  v_head text;
  v_out text;
begin
  for r in
    select o.order_number, o.status, o.item_name, o.drop_method, coalesce(c.name, o.guest_name, '?') as name,
           v_today - coalesce(o.scheduled_date, (o.created_at at time zone 'America/Jamaica')::date) as days,
           v_today - (coalesce((select max(e.created_at) from order_status_events e
                                 where e.order_id = o.id and e.status = 'ready_for_pickup'),
                               o.updated_at) at time zone 'America/Jamaica')::date as ready_days
      from orders o left join customers c on c.id = o.customer_id
     where o.status <> 'completed'
     order by coalesce(o.scheduled_date, (o.created_at at time zone 'America/Jamaica')::date), o.created_at
  loop
    v_open := v_open + 1;
    v_line := format('%s · %s · %s', replace(r.order_number, 'CC-', ''), r.name, left(r.item_name, 28));
    if r.status = 'ready_for_pickup' and r.ready_days >= v_days and r.drop_method = 'pickup' then
      v_n_delivery := v_n_delivery + 1;
      if v_n_delivery <= c_max_lines then v_delivery := v_delivery || format(E'%s (ready %sd)\n', v_line, r.ready_days); end if;
    elsif r.status = 'ready_for_pickup' and r.ready_days >= v_days then
      v_n_pickup := v_n_pickup + 1;
      if v_n_pickup <= c_max_lines then v_pickup := v_pickup || format(E'%s (ready %sd)\n', v_line, r.ready_days); end if;
    elsif r.status <> 'ready_for_pickup' and r.days >= v_days then
      v_n_overdue := v_n_overdue + 1;
      if v_n_overdue <= c_max_lines then
        v_overdue := v_overdue || format(E'%s (%sd, %s)\n', v_line, r.days,
          case r.status when 'received' then 'received' when 'in_progress' then 'in progress'
                        when 'pending_payment' then 'payment' else r.status::text end);
      end if;
    else
      v_n_bench := v_n_bench + 1;
      if v_n_bench <= c_max_lines then
        v_bench := v_bench || format(E'%s%s\n', v_line,
          case when r.status = 'ready_for_pickup' then ' · ✅ Ready'
               when r.days > 0 then format(' (%sd)', r.days) else '' end);
      end if;
    end if;
  end loop;

  if v_open = 0 then
    return 'CCJ morning: no open orders 🎉';
  end if;

  v_head := format('CCJ morning: %s open, %s need attention', v_open, v_n_overdue + v_n_pickup + v_n_delivery);
  v_out := v_head
    || case when v_n_overdue > 0 then format(E'\n\n⚠️ Overdue (%s+ days):\n', v_days) || v_overdue
         || case when v_n_overdue > c_max_lines then format(E'…and %s more\n', v_n_overdue - c_max_lines) else '' end else '' end
    || case when v_n_pickup > 0 then format(E'\n📦 Not collected (%s+ days):\n', v_days) || v_pickup
         || case when v_n_pickup > c_max_lines then format(E'…and %s more\n', v_n_pickup - c_max_lines) else '' end else '' end
    || case when v_n_delivery > 0 then format(E'\n🚚 Awaiting delivery (%s+ days):\n', v_days) || v_delivery
         || case when v_n_delivery > c_max_lines then format(E'…and %s more\n', v_n_delivery - c_max_lines) else '' end else '' end;

  -- On-track orders are the least urgent: list them only if the message still fits.
  if v_n_bench > 0 then
    if v_n_bench <= c_max_lines and length(v_out) + length(v_bench) + 60 <= c_max_len then
      v_out := v_out || E'\n🧽 On track:\n' || v_bench;
    else
      v_out := v_out || format(E'\n🧽 On track: %s orders (send "list" for all)\n', v_n_bench);
    end if;
  end if;

  return left(v_out || E'\nReply: start / ready / done N', 4000);
end;
$$;

revoke all on function public.staff_stale_digest(int) from public, anon, authenticated;
grant execute on function public.staff_stale_digest(int) to service_role;
