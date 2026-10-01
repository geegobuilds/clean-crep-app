-- /account: a signed-in customer picks up guest bookings (website, Creppie) made
-- with their email after their account already existed. Verified email only.
create or replace function claim_my_guest_orders()
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  update orders o
     set customer_id = u.id
    from auth.users u
   where u.id = auth.uid()
     and u.email_confirmed_at is not null
     and exists (select 1 from customers c where c.id = u.id)
     and o.customer_id is null
     and o.guest_email is not null
     and lower(o.guest_email) = lower(u.email);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function claim_my_guest_orders() from public, anon;
grant execute on function claim_my_guest_orders() to authenticated;
