# Handoff: CCJ ops bot (Telegram)

**Last updated:** 2026-10-22 · branch `main`

## Goal
Run the shop's order status from Geego's phone, and surface stuck orders within a day.

## State
- Done: **CCJ Orders Bot (Telegram)** (n8n `UHOfOMTBwLUxBNYx`, Active). Commands: `list`, `start/ready/done N`, `N` for details, `dup A B` (deletes A as a duplicate of B). Only Telegram ID 1684886876 (Geego) is allowed.
- Done: **CCJ Stale Orders Alert** (n8n `D97Wbi82ObaeOATh`, Active). Daily 07:00 Jamaica digest to Geego. First test send 2026-10-22 OK (6 open, 5 overdue).
- Queued: customer "ready" message via ManyChat with an add-on offer (waiting on Geego's go-ahead).

## How it works
- Bot: Telegram Trigger → "Is Geego?" → Postgres `select public.staff_bot_command($1)` → reply. Logic: `supabase/migrations/0033_bot_delete_duplicate.sql` (`staff_bot_command`, `staff_delete_duplicate`), test `supabase/tests/bot_dup.sql`.
- `dup` guards: same customer (guests by phone), both open, same service, booked within 7 days; refuses photos, Vault grades/items, Club credit, welcome-back discount. Every delete is copied to `deleted_orders` first (restore by hand with the orders insert triggers disabled).
- Digest: Schedule 07:00 (workflow timezone America/Jamaica) → `select public.staff_stale_digest(5)` → Telegram send (HTML-escaped).
- `staff_stale_digest` = `supabase/migrations/0032_staff_stale_digest.sql`, test `supabase/tests/stale_digest.sql` (`supabase/tests/run.sh stale_digest`).
- Sections: Overdue (not ready, 5+ days since booked-for date), Not collected (ready 5+ days, drop-off), Awaiting delivery (ready 5+ days, CrepRun pickup), On track. Capped to fit one Telegram message.
- Credentials (n8n, project "Clean Crep Jamaica"): `CCJ Telegram Bot`, `Supabase - Clean Crep Jamaica`. Never use `BSJ Telegram Bot` here.

## Decisions and gotchas
- 2026-10-22: The Supabase connector times out applying SQL that contains a delete; run such migrations in the Supabase SQL Editor (Cowork).
- 2026-10-22: Dedicated CCJ bot, separate from the BSJ lab bot (a Telegram bot feeds only one listening workflow).
- 2026-10-22: "Ready" age is read from `order_status_events`, not `updated_at` (edits such as guest claims bump `updated_at`).
- 2026-10-22: Both functions are staff-only: no anon/authenticated EXECUTE grant. Keep it that way.

## Next
Watch the first 07:00 digest; if Geego wants a different threshold, change `5` in the "Build Digest" node.

## Resume prompt
Work in repo `geegobuilds/clean-crep-app`, branch `main`. Read `handoff/ops-bot.md` first. You're continuing the CCJ ops bot workstream (Telegram order bot + 07:00 stale-orders digest in n8n, logic in Supabase). Confirm the current state back to me, then wait for the next ask.
