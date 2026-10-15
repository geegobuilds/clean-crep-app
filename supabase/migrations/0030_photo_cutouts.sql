-- 0030 — Product-shot cutouts.
--
-- When staff add an "after" photo, the dashboard removes the background in the
-- browser (BiRefNet-lite, MIT licence, runs on the staff phone/computer) and
-- saves a transparent PNG next to it as kind 'cutout'. The app uses the cutout
-- as the Vault cover (the product-shot look); before/after stay as they were.
-- Same bucket, same rules: staff upload, customers read only their own.

alter table public.order_photos drop constraint if exists order_photos_kind_check;
alter table public.order_photos add constraint order_photos_kind_check check (kind in ('before', 'after', 'cutout'));
