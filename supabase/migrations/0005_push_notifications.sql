-- Push notifications for order updates.
--
-- The app registers each phone's Expo push token here (via register_push_token).
-- Every row inserted into `notifications` — which handle_order_status_change()
-- already writes on each order status change, with customer-facing copy like
-- "Your AF1s is clean and waiting for pickup." — is also sent as a push to all
-- of that customer's phones through Expo's push service, straight from Postgres
-- via pg_net (async HTTP; no Edge Function to deploy).
--
-- Guest (Creppie/WhatsApp) orders have no app customer and no tokens, so they
-- never push. A failed send never blocks the order update that caused it.

create extension if not exists pg_net with schema extensions;

create table push_tokens (
  token text primary key,                       -- ExponentPushToken[...]
  customer_id uuid not null references customers (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index push_tokens_customer_id_idx on push_tokens (customer_id);

alter table push_tokens enable row level security;

create policy "push_tokens_select_own" on push_tokens
  for select using (customer_id = auth.uid());
create policy "push_tokens_delete_own" on push_tokens
  for delete using (customer_id = auth.uid());

-- Upsert through a function rather than insert/update policies: a token belongs
-- to a phone, not a person, so when someone else signs in on the same phone the
-- token must move to them — which a plain RLS update on the old owner's row
-- would (correctly) refuse.
create or replace function register_push_token(p_token text, p_platform text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if p_token !~ '^Expo(nent)?PushToken\[.+\]$' then
    raise exception 'invalid push token';
  end if;
  insert into push_tokens (token, customer_id, platform)
  values (p_token, auth.uid(), p_platform)
  on conflict (token) do update
    set customer_id = excluded.customer_id,
        platform = excluded.platform,
        last_seen_at = now();
end;
$$;

-- Called on sign-out so the next person on this phone doesn't get the
-- previous customer's order updates.
create or replace function unregister_push_token(p_token text)
returns void language sql security definer set search_path = public as $$
  delete from push_tokens where token = p_token and customer_id = auth.uid();
$$;

-- One Expo push message per registered phone for a notification. Separate
-- from the trigger so it can be inspected/tested with a plain SELECT.
create or replace function push_messages_for_notification(n notifications)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'to', t.token,
    'title', n.title,
    'body', n.body,
    'sound', 'default',
    'priority', 'high',
    'channelId', 'order-updates',         -- Android channel created by the app
    'data', jsonb_build_object('notificationId', n.id, 'orderId', n.order_id, 'url', '/orders')
  )), '[]'::jsonb)
  from push_tokens t
  where t.customer_id = n.customer_id;
$$;

create or replace function send_push_for_notification()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  messages jsonb;
begin
  if new.customer_id is null then
    return new;
  end if;
  messages := push_messages_for_notification(new);
  if jsonb_array_length(messages) = 0 then
    return new;
  end if;
  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    body := messages,
    headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
  );
  return new;
exception when others then
  -- Never let a push problem roll back the order/notification write.
  raise warning 'push send failed for notification %: %', new.id, sqlerrm;
  return new;
end;
$$;

create trigger on_notification_send_push
  after insert on notifications
  for each row execute function send_push_for_notification();

-- Only the functions above (running as definer) touch these on the app's behalf.
revoke all on function push_messages_for_notification(notifications) from public, anon, authenticated;
revoke all on function send_push_for_notification() from public, anon, authenticated;
revoke all on function register_push_token(text, text) from public, anon;
revoke all on function unregister_push_token(text) from public, anon;
grant execute on function register_push_token(text, text) to authenticated;
grant execute on function unregister_push_token(text) to authenticated;
