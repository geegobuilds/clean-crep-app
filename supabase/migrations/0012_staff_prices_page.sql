-- The staff dashboard's Prices & Zones page edits CrepRun zones and lists the
-- areas customers asked for outside them. Services and add_ons already have
-- staff write policies (0001, 0007).

-- Staff can read (including inactive zones) and edit zones.
create policy "zones_write_staff" on public.zones
  for all using (is_staff()) with check (is_staff());

-- Staff can read out-of-zone pickup requests (written only by Creppie/n8n).
create policy "zone_requests_select_staff" on public.zone_requests
  for select using (is_staff());
