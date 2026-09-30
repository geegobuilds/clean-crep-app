-- One-off Airtable -> Supabase history copy: remember each row's Airtable id
-- so the import can be re-run without duplicates. Applied to live 2026-09-30
-- (recorded as 20260930182330).
alter table public.conversations add column if not exists airtable_id text;
create unique index if not exists conversations_airtable_id_key on public.conversations (airtable_id) where airtable_id is not null;
alter table public.orders add column if not exists airtable_id text;
create unique index if not exists orders_airtable_id_key on public.orders (airtable_id) where airtable_id is not null;
