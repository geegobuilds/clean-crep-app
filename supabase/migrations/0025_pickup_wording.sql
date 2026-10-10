-- Order-status notifications that know drop-off from CrepRun pickup.
--
-- Until now every new order said "Drop-off confirmed." and every finished one
-- "has been picked up", even when CrepRun collects and delivers. Drop-off
-- copy is unchanged except "received", which now names the day; pickup orders
-- get their own: collected on <day>, ready for delivery, delivered.
-- Same function otherwise (events row, loyalty points on completion).

create or replace function handle_order_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  notif_type notification_type;
  notif_title text;
  notif_body text;
  pickup boolean := new.drop_method = 'pickup';
  on_day text := case when new.scheduled_date is null then '' else ' on ' || to_char(new.scheduled_date, 'FMDy FMDD Mon') end;
begin
  insert into order_status_events (order_id, status, changed_by)
  values (new.id, new.status, auth.uid());

  if new.customer_id is not null then
    case new.status
      when 'received' then
        notif_type := 'received';
        notif_title := 'Order Received';
        notif_body := case when pickup
          then 'We got your ' || new.item_name || ' booking. CrepRun collects' || on_day || '.'
          else 'We got your ' || new.item_name || ' booking. Drop-off' || on_day || ' at Shop 19, Pristine Plaza.' end;
      when 'in_progress' then
        notif_type := 'progress';
        notif_title := 'In Progress';
        notif_body := 'Your ' || new.item_name || ' is being cleaned right now.';
      when 'ready_for_pickup' then
        notif_type := 'ready';
        notif_title := case when pickup then 'Ready for Delivery' else 'Ready for Pickup' end;
        notif_body := case when pickup
          then 'Your ' || new.item_name || ' is clean. CrepRun is bringing it back to you.'
          else 'Your ' || new.item_name || ' is clean and waiting for pickup.' end;
      when 'completed' then
        notif_type := 'complete';
        notif_title := 'Order Completed';
        notif_body := case when pickup
          then 'Your ' || new.item_name || ' has been delivered. Step clean!'
          else 'Your ' || new.item_name || ' has been picked up. Step clean!' end;
      when 'pending_payment' then
        notif_type := 'promo';
        notif_title := 'Payment Pending';
        notif_body := 'Payment is pending on your ' || new.item_name || ' order.';
    end case;

    insert into notifications (customer_id, order_id, type, title, body)
    values (new.customer_id, new.id, notif_type, notif_title, notif_body);

    if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
      update customers set loyalty_points = loyalty_points + 50 where id = new.customer_id;
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function handle_order_status_change() from public, anon, authenticated;
