-- 0031 — Ready / Completed notifications lead to the item's before & after.
--
-- When an order cleaned a Vault item (orders.pair_id) and the customer has the
-- Vault and the Passport (both flags: the Vault screen sends people without
-- `vault` back to Home), the Ready and Completed messages say the before & after is ready
-- to see (only once an after photo is on the order), and their push opens that
-- item in the Vault (/vault?pair=<id>: before/after, care history, "Share
-- passport") instead of the Orders tab. Everything else is as in 0025 / 0017.

-- True when this notification should lead to the item's Vault page.
create or replace function notification_pair(n notifications)
returns uuid language sql stable security definer set search_path = public as $$
  select o.pair_id
    from orders o
   where o.id = n.order_id
     and o.pair_id is not null
     and n.type in ('ready', 'complete')
     and feature_enabled_for('vault', n.customer_id)
     and feature_enabled_for('passport', n.customer_id);
$$;

create or replace function handle_order_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  notif_type notification_type;
  notif_title text;
  notif_body text;
  pickup boolean := new.drop_method = 'pickup';
  on_day text := case when new.scheduled_date is null then '' else ' on ' || to_char(new.scheduled_date, 'FMDy FMDD Mon') end;
  -- The before & after is worth a line once there is an after photo of a Vault item.
  show_after boolean := new.pair_id is not null
    and new.customer_id is not null
    and feature_enabled_for('vault', new.customer_id)
    and feature_enabled_for('passport', new.customer_id)
    and exists (select 1 from order_photos ph where ph.order_id = new.id and ph.kind = 'after');
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
          else 'Your ' || new.item_name || ' is clean and waiting for pickup.' end
          || case when show_after then ' Tap to see the before & after.' else '' end;
      when 'completed' then
        notif_type := 'complete';
        notif_title := 'Order Completed';
        notif_body := case when pickup
          then 'Your ' || new.item_name || ' has been delivered. Step clean!'
          else 'Your ' || new.item_name || ' has been picked up. Step clean!' end
          || case when show_after then ' Its before & after is saved to its Crep Passport.' else '' end;
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

-- A push with no order behind it (a nudge) opens Book; an order update opens
-- Orders, or the item's Vault page when it leads to the before & after.
create or replace function push_messages_for_notification(n notifications)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'to', t.token,
    'title', n.title,
    'body', n.body,
    'sound', 'default',
    'priority', 'high',
    'channelId', 'order-updates',         -- Android channel created by the app
    'data', jsonb_build_object('notificationId', n.id, 'orderId', n.order_id,
                               'url', case when n.order_id is null then '/book'
                                           when notification_pair(n) is not null then '/vault?pair=' || notification_pair(n)
                                           else '/orders' end)
  )), '[]'::jsonb)
  from push_tokens t
  where t.customer_id = n.customer_id;
$$;

revoke execute on function handle_order_status_change() from public, anon, authenticated;
revoke all on function push_messages_for_notification(notifications) from public, anon, authenticated;
revoke all on function notification_pair(notifications) from public, anon, authenticated;
