-- Morning digest for the CCJ Orders Bot (n8n "CCJ Stale Orders Alert", 07:00 Jamaica).
-- Lists every open order, overdue ones first, so a stuck order surfaces within a day.
--   Overdue:          received / in progress / payment, p_days+ since booked-for date
--   Waiting pickup:   ready for pickup, p_days+ since last update
-- Read-only. Same age rule as staff_bot_command('list'). Staff-only: no anon/authenticated grant.

create or replace function public.staff_stale_digest(p_days int default 5)
returns text
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  r record;
  v_overdue text := '';
  v_pickup text := '';
  v_bench text := '';
  v_open int := 0;
  v_late int := 0;
  v_line text;
begin
  for r in
    select o.order_number, o.status, o.item_name, coalesce(c.name, o.guest_name, '?') as name,
           (current_date - coalesce(o.scheduled_date, o.created_at::date)) as days,
           (current_date - o.updated_at::date) as idle_days
      from orders o left join customers c on c.id = o.customer_id
     where o.status <> 'completed'
     order by coalesce(o.scheduled_date, o.created_at::date), o.created_at
  loop
    v_open := v_open + 1;
    v_line := format(E'%s · %s · %s', replace(r.order_number, 'CC-', ''), r.name, left(r.item_name, 28));
    if r.status = 'ready_for_pickup' then
      if r.idle_days >= p_days then
        v_late := v_late + 1;
        v_pickup := v_pickup || format(E'%s (ready %sd)\n', v_line, r.idle_days);
      else
        v_bench := v_bench || format(E'%s · ✅ Ready\n', v_line);
      end if;
    elsif r.days >= p_days then
      v_late := v_late + 1;
      v_overdue := v_overdue || format(E'%s (%sd, %s)\n', v_line, r.days,
        case r.status when 'received' then 'received' when 'in_progress' then 'in progress'
                      when 'pending_payment' then 'payment' else r.status::text end);
    else
      v_bench := v_bench || format(E'%s%s\n', v_line,
        case when r.days > 0 then format(' (%sd)', r.days) else '' end);
    end if;
  end loop;

  if v_open = 0 then
    return 'CCJ morning: no open orders 🎉';
  end if;

  return format(E'CCJ morning: %s open, %s need attention', v_open, v_late)
    || case when v_overdue <> '' then E'\n\n⚠️ Overdue (' || p_days || E'+ days):\n' || v_overdue else '' end
    || case when v_pickup <> '' then E'\n📦 Not collected (' || p_days || E'+ days):\n' || v_pickup else '' end
    || case when v_bench <> '' then E'\n🧽 On track:\n' || v_bench else '' end
    || E'\nReply: start / ready / done N';
end;
$$;

revoke all on function public.staff_stale_digest(int) from public, anon, authenticated;
grant execute on function public.staff_stale_digest(int) to service_role;
