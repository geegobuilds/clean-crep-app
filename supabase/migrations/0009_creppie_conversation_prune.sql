-- Replaces the n8n "CCJ - Prune Old Conversations" Airtable job: on the 1st of
-- each month at 03:00 Jamaica (08:00 UTC), drop Creppie chat rows older than
-- 30 days. Applied to live 2026-09-30 (recorded as 20260930103100).
create extension if not exists pg_cron;
select cron.schedule('creppie-prune-conversations', '0 8 1 * *', $$delete from public.conversations where created_at < now() - interval '30 days'$$);
