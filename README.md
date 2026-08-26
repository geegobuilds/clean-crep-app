# Clean Crep App

Customer mobile app, landing page, and staff operator dashboard for **Clean Crep Jamaica**
— a premium sneaker & Clarks cleaning service (Shop 19, Pristine Plaza, Half Way Tree,
Kingston). This repo is the real, Supabase-backed implementation of the designs originally
mocked up in Claude Design — see `project/` and `chats/` for that original handoff bundle
(kept for reference; not part of the shipped app).

> The WhatsApp/IG booking automation ("Creppie") that predates this app lives in a
> separate repo, [`clean-crep-systems`](https://github.com/geegobuilds/clean-crep-systems)
> — see this app's README "Known gaps" section for how the two currently relate.

## What's here

```
apps/mobile      Customer app — Expo (React Native + TypeScript, Expo Router)
apps/web         Landing page + staff Operator Dashboard — Next.js (App Router)
packages/shared  Design tokens, domain types, order-status logic, Supabase client factory
supabase/        Postgres schema (migrations), RLS policies, seed data
project/, chats/ Original Claude Design prototype + the chat transcript it came from
```

Everything shares one design system (colors, spacing, radius, type) ported 1:1 from the
prototype's `app-screens.jsx` — see `packages/shared/src/tokens.ts`.

**Not built**, on purpose:
- **Instagram post templates** (`project/Sneaker Post.html` etc.) — excluded at the user's request.
- **Client Proposal Deck** (`project/Client Proposal Deck.html`) — a pricing pitch for reselling
  this app as a template to other businesses, not part of Clean Crep Jamaica's actual product.

## Running it locally

You need [Node 20+](https://nodejs.org), [Docker](https://docker.com) (for local Supabase),
and the [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm i -g supabase` or `brew
install supabase/tap/supabase`).

```bash
npm install                 # installs all workspaces (apps/mobile, apps/web, packages/shared)

supabase start               # spins up local Postgres/Auth/Realtime/Studio (needs Docker running)
                              # applies supabase/migrations/*.sql and supabase/seed.sql automatically
                              # prints your local anon key + Studio URL when it's done

cp apps/mobile/.env.example apps/mobile/.env
cp apps/web/.env.local.example apps/web/.env.local
# paste the local anon key + http://127.0.0.1:54321 (already the default) into both

npm run mobile                # starts Expo — press i/a for simulator, or scan the QR with Expo Go
npm run web                   # starts Next.js dev server on http://localhost:3000
```

### Demo data

`supabase/seed.sql` seeds the three services (Sneaker Clean, Clarks Clean, Sole Refresh) —
that runs automatically. Demo **orders** need a real customer account first (orders.customer_id
is a real `auth.users` foreign key), so:

1. Sign up a customer through the mobile app's sign-in screen (or Studio's Auth panel).
2. Grab that user's id from Studio → Authentication → Users.
3. `psql "$(supabase status -o json | jq -r .DB_URL)" -v customer_id='<uuid>' -f supabase/seed-demo-orders.sql`

To get into the **operator dashboard** (`/staff/login`), a user needs a row in the `staff`
table — there's no self-service staff signup by design. Create one via Studio: sign up (or use
an existing) user in Auth, then insert a row into `public.staff` with that same `id`.

## Architecture notes

- **One Supabase backend** (Postgres + Auth + Realtime) serves both apps. RLS policies (in
  `supabase/migrations/0001_init.sql`) are the actual authorization boundary: customers only
  see their own orders/notifications, `services` is public-read, and everything else requires
  a row in `staff`.
- **Order status is one flat enum** (`received → in_progress → ready_for_pickup → completed`,
  plus an orthogonal `pending_payment`), matching how the original prototype's dashboard
  modeled it. The customer-facing 4-step progress bar is a display-only derivation of that
  single value — see `packages/shared/src/status.ts`.
- **A Postgres trigger** (`handle_order_status_change` in the migration) does the busy-work on
  every order insert/status change: writes an audit row to `order_status_events`, generates the
  matching customer notification, and awards 50 loyalty points on completion. Neither app calls
  this directly — it fires from a plain `orders` update.
- **Realtime**: both the mobile Order Tracker/Inbox and the web dashboard subscribe to Postgres
  changes on `orders`/`notifications`, so a status update from the dashboard shows up live on
  the customer's phone without a refresh.

## Known gaps before this is a finished, shippable v1

- **Auth is email/password only.** The original chat discussed phone-based login; that needs a
  Twilio (or similar) SMS provider wired into Supabase Auth, which requires the user's
  Twilio account. Straightforward to add later — swap the sign-in screen's calls to
  `supabase.auth.signInWithOtp({ phone })`.
- **App icon/splash art is a placeholder.** `apps/mobile/assets/images/*` were auto-generated
  by cropping the circular brand mark onto a navy background — functional, but a designer
  should produce a proper icon set (in particular the Android monochrome/themed-icon layer,
  which is currently just a filled silhouette) before a store submission.
- **"Book Now" on the landing page currently opens WhatsApp**, not an app store link
  (`apps/web/src/app/page.tsx`, `BOOK_NOW_URL`) — there's nothing to link to until the app is
  published. Swap that constant once you have real App Store / Play Store URLs.
- **This sandbox has no Docker daemon**, so the Supabase migrations were validated against a
  plain local Postgres with a hand-written stub of the `auth` schema (proved the schema,
  triggers, and RLS policies all apply and the status-change trigger correctly writes audit
  events, notifications, and loyalty points — see git history / ask if you want the stub script
  again) rather than the full `supabase start` stack. Run `supabase start` yourself once to
  confirm end-to-end before deploying.
- **Two separate order pipelines exist right now.** `clean-crep-systems` (a sibling repo)
  holds Creppie, an n8n workflow that already takes WhatsApp/IG bookings and writes them to
  **Airtable** — unrelated to this app's Supabase `orders` table. A booking through Creppie
  and a booking through this app currently land in two different places. Decide whether
  Creppie should keep writing to Airtable as a separate channel, or get pointed at this
  app's Supabase backend instead.

## Going live

1. **Supabase**: create a hosted project at [supabase.com](https://supabase.com), run
   `supabase link` + `supabase db push` to apply the migrations, then put the project's URL/anon
   key into both apps' env files (and your host's env vars — see below).
2. **Web** (landing page + dashboard): deploy `apps/web` to [Vercel](https://vercel.com) — set
   the project's Root Directory to `apps/web` (this is an npm workspaces monorepo, Vercel
   detects it automatically) and add `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`
   as project env vars.
3. **Mobile**: `npx eas build` (config already in `apps/mobile/eas.json`) needs an
   [Expo](https://expo.dev) account, then `eas submit` needs an Apple Developer account
   ($99/yr) and a Google Play Console account ($25 one-time) — both of which only the business
   owner can enroll in.
4. **WhatsApp number**: `18765072163` is hardcoded from the original prototype — search for it
   across `apps/` if it needs to change.
