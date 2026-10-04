-- 0017 — Before/after photos on orders.
--
-- Staff shoot a "before" at drop-off and an "after" when it's clean (staff
-- dashboard › order page, phone camera). The customer sees them on the order
-- in the app (before/after slider + share card).
--
-- Files live in a PRIVATE Storage bucket `order-photos` at
-- `<order_id>/<kind>-<timestamp>.<ext>`; the app reads them through short-lived
-- signed URLs. A row in order_photos registers each file against its order.
--
-- Access:
--   * staff: upload, replace, delete, read everything
--   * customers: read only photos on their own orders (rows AND files)
--   * anon / other customers: nothing

create table if not exists public.order_photos (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  kind text not null check (kind in ('before', 'after')),
  storage_path text not null unique,
  uploaded_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists order_photos_order_id_idx on public.order_photos (order_id, kind, created_at);

alter table public.order_photos enable row level security;

create policy "order_photos_select_own_or_staff" on public.order_photos
  for select using (
    public.is_staff()
    or exists (select 1 from public.orders o where o.id = order_photos.order_id and o.customer_id = auth.uid())
  );

create policy "order_photos_insert_staff" on public.order_photos
  for insert with check (public.is_staff());

create policy "order_photos_update_staff" on public.order_photos
  for update using (public.is_staff()) with check (public.is_staff());

create policy "order_photos_delete_staff" on public.order_photos
  for delete using (public.is_staff());

revoke all on public.order_photos from anon;

-- Private bucket: 10 MB per photo, images only (HEIC for iPhones).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('order-photos', 'order-photos', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "order_photos_files_staff_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'order-photos' and public.is_staff());

create policy "order_photos_files_staff_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'order-photos' and public.is_staff())
  with check (bucket_id = 'order-photos' and public.is_staff());

create policy "order_photos_files_staff_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'order-photos' and public.is_staff());

-- A customer can read (and so sign a URL for) a file only when it's registered
-- in order_photos against one of their own orders.
create policy "order_photos_files_read_own_or_staff" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'order-photos'
    and (
      public.is_staff()
      or exists (
        select 1
        from public.order_photos p
        join public.orders o on o.id = p.order_id
        where p.storage_path = storage.objects.name
          and o.customer_id = auth.uid()
      )
    )
  );
