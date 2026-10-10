-- 0028 — Customers can remove a Vault item that has never been cleaned
-- (added by mistake, sold, a duplicate). Anything with a clean keeps its care
-- history: only staff can delete those (pairs_delete_staff, 0020).
create policy "pairs_delete_own_uncleaned" on pairs for delete using (
  customer_id = auth.uid()
  and feature_enabled('vault')
  and not exists (select 1 from orders o where o.pair_id = pairs.id)
);
