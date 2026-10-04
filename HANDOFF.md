# HANDOFF

Running state of the Clean Crep App build. Read this first every session; update it at the
end of any session where something meaningful changed. Keep it short — this is a status
board, not a history (git log is the history).

_Last updated: 2026-10-04_

## Current Status

- **Code**: Expo customer app (`apps/mobile`), Next.js landing page + staff dashboard
  (`apps/web`), and Supabase schema (`supabase/migrations/0001`–`0004`) are built on `main`.
  Latest shipped work: staff password-reset page, password-recovery race fix, Creppie orders
  labelled by system name in the dashboard.
- **Pre-launch UX fixes (merged in PR #2, 2026-09-26)**: guest browsing (sign-in only at Confirm
  Booking, via an in-screen sheet that keeps the booking), friendly error copy
  (`apps/mobile/src/lib/errors.ts` — no raw Supabase/JS errors on screen), and skeleton /
  empty / error-with-retry states on every data screen (`apps/mobile/src/components/states.tsx`).
  Also: customers profile row is now auto-created on first sign-in (fixes bookings failing for
  accounts created while email confirmation is on).
- **Also in PR #2 (merged 2026-09-26)**:
  - **Automated phone checks** — `npm run e2e`: 11 journeys in an emulated Pixel 7 against a
    real local Supabase (Docker works in the cloud sandbox). Run after every change. They
    caught a **crash on `main`** (duplicate realtime channel names → opening Orders crashed
    for signed-in users) and a stale-retry bug; both fixed.
  - **Push notifications** — migration `0005_push_notifications.sql` (tokens + pg_net send on
    every order-update notification) and app side (`lib/push.ts`, explainer after booking,
    Profile › Notifications, tap → Orders). Server side is tested; **delivery to a real phone
    is not** (needs the EAS/Firebase setup below).
  - **Google review ask** — once, after a completed order (`components/review-ask.tsx`).
  - **Creppie mascot** — every loading/empty/error/offline/success/sign-in state goes through
    `components/creppie/`; real art (cut from Geego's renders) is in `assets/creppie/`, wired
    via `moods.ts`. All 6 poses in place (incl. waving for sign-in prompts).
- **Add-ons + Creppie web chat (merged in PR #7, 2026-09-30)**: Book screen sells Deep Clean /
  Sole Refresh / 2 kits and charges the J$1,000 pickup fee, priced by the database (migration
  `0007_add_ons.sql`, **applied to live** the same day). Landing page has an "Ask Creppie" chat
  bubble (his face; waving upper body greets you inside) relayed to the n8n Creppie webhook;
  dark until `CREPPIE_WEBHOOK_URL` is set on Vercel. **"Need help?" nudge** (PR open): once per
  visit, context copy for Services / Location, face bounces; snoozed 7 days after ✕, never shown
  to someone who has chatted.
- **Safety net (2026-09-30)**: GitHub Actions `Checks` runs typecheck + lint + the phone
  checks on every PR and push to main (`.github/workflows/checks.yml`). Routine **"Clean Crep
  daily health check"** (`trig_01XVg7G6iEY2aUHZCsw1b68a`, 6:45 AM Jamaica, push to Geego's phone
  only when something's wrong): live DB status, uncollected/stale orders, Creppie sync
  freshness, new security advisors. Needs the Supabase connector attached in the routine's
  settings (couldn't be attached from the session).
- **Creppie 3.0 is live on Supabase (2026-09-30)**: n8n workflow "Creppie 3.0 (Supabase)"
  (`UjdxjuN7UPPNs3D7`, exported to `clean-crep-systems/creppie.json`) reads prices, zones, open
  orders and chat history from this database and writes bookings to `orders` — no Airtable calls.
  2.9.0 and the Airtable prune job are off; chat pruning is a pg_cron job (0009). Website chat
  messages (`web-*`) get their reply in the webhook response (published 2026-09-30 with Geego's OK;
  previous version `3a30baad` to roll back to). **Proven end to end 2026-09-30**: an Instagram test
  booking landed in `orders` with Sole Refresh in `add_ons` (test order deleted). Drop-off date
  fixed the same day: Creppie now records the customer's stated day (`Add Date Context` /
  `Pick Scheduled Date`); blank or odd dates fall back to today.
- **2026-10-02**:
  - Shop hours are **Mon–Fri 10–6, Sat 10–3, closed Sundays + public holidays** (Creppie was right;
    website fixed in #21).
  - Creppie (n8n version `02e68de1`, exported in systems #5): Instagram photos/videos are detected
    (HEAD request on the lookaside link) and thanked instead of "can't open links"; Creppie asks the
    first name early and only a number/email at confirm (Geego's call: people stalled there).
  - ManyChat Comment automation (CLEAN/PRICE): opener is now a question ("Wah yuh need cleaned…
    how many pairs?"), seeded into Creppie's history. The double greeting Seejay "got" was a
    ManyChat inbox display glitch only.
  - Health check: ends with a weekly "chats → bookings" line; warns only at 20+ chats with 0 bookings.
  - `npm run ios` uses `--localhost` (#20), so a Wi‑Fi change can't break the Simulator.
  - Reminders set: Mon Oct 5 (add cleancrep.com booking link to Creppie, Geego's call), Fri Oct 9
    (1-week before/after check on the name-early change).
- **Customer emails live (2026-10-01)**: Supabase Auth sends through Gmail SMTP
  (cleancrepja@gmail.com, app password; 60/h), branded "Confirm signup" + "Magic link" templates
  with token_hash links to /account/confirm. Tested end to end: inbox (not spam), signed in,
  profile created. Gmail is fine for now; move to a transactional sender (e.g. Resend) when volume
  grows. The account page now shows friendly copy for auth errors (`friendlyAuthError`).
- **Health check tune-up (2026-10-01)**: migration 0016 pins `search_path` on `jm_today()` /
  `next_pickup_date()` (advisor warning; applied to live). The daily routine's known list now
  includes `book_web_order` (public by design) and `claim_my_guest_orders`; its Creppie check only
  warns when 5+ people chatted in 7 days with no booking logged (no Airtable comparison any more).
- **App pickups priced by CrepRun zone (merged in PR #17, 2026-10-01; 0015 live; Geego's call)**: Book › Pickup now asks
  for the area (zone list with day + rate); the order stores `zone_id` and `price_app_order()`
  (migration `0015_app_pickup_zones.sql`) adds the zone's round-trip rate and sets the date to its
  next pickup day, same as the website and Creppie. The flat J$1,000 `pickup-delivery` add-on is
  retired (inactive). Drop-off days skip Sundays. App builds from before this can't book pickups
  (the database now requires a zone); none are in the stores yet.
- **Website Quick Book + flip tiles (merged in PR #16, 2026-10-01; 0013 + 0014 live)**: the hero is now a 3-step booking card
  (service/pairs/extras → drop-off day or CrepRun zone → name, phone, **email required**); every
  "Book Now" scrolls to it instead of WhatsApp. Services are flip cards (front: price + best for;
  back: what's done, turnaround, upsell, "Book this"). Migration `0013_web_quick_book.sql`:
  `book_web_order()` prices (service and extras per pair, kits once, zone rate for pickup) and dates
  it (drop-off Mon–Sat within 2 weeks; pickup = zone's next day), `source = 'web'`; a new account
  claims guest orders with its **verified** email (`claim_guest_orders()` on customers insert).
  After booking, the site emails a sign-in link (Supabase OTP) to `/account/confirm` → `/account`
  (set a password for the app, see bookings and loyalty points; `claim_my_guest_orders()`, migration 0014,
  picks up bookings made later with the same verified email). **Live setup still needed** (Cowork): custom SMTP in
  Supabase Auth (the built-in sender only reaches team addresses), redirect URL
  `https://www.cleancrep.com/account/confirm`, and branded Magic Link / Confirm signup templates.
- **Ask Creppie in the app (merged in PR #15, 2026-10-01; n8n published)**: floating face button on Home and Book opens a
  full-screen chat (`components/creppie-chat.tsx`, `lib/creppie.ts`) talking to the website relay
  (`EXPO_PUBLIC_CREPPIE_URL`, default `https://www.cleancrep.com/api/creppie`) with
  `channel: "app"`. Anyone can ask questions; **booking needs an account**: the relay verifies the
  Supabase token and sends `subscriber_id: cust-<user id>`, and Creppie puts the order on that
  account (Orders tab, push, points). A guest who tries to book gets "sign in first" plus a sign-in
  card; after signing in the chat asks Creppie to go ahead. The website still takes guest bookings.
  n8n version `45e65142` published 2026-10-01 (roll back to `2faeee65`).
- **Staff login has "Forgot password?"** (2026-09-30) — emails a reset link to the staff address.
  The only staff account is `walkergiovani+ccjsmoketest@gmail.com` (a leftover test alias);
  create a proper shop login before hiring.
- **Creppie dual-write is live**: the n8n workflow (`clean-crep-systems/creppie.json`) writes
  WhatsApp/IG bookings to Airtable _and_ to this app's `orders` table as guest orders
  (`source = 'creppie'`). The two Postgres nodes live only in n8n, not in either repo.
- **Android package / iOS bundle ID**: `com.cleancrepjamaica.app` (`apps/mobile/app.json`).
- **Play Store release**: blocked on Google Play Console org verification (see Active Blockers).
- **Previous session** ("Design: Clean Crep App") died on a container/repo-bundle error; this
  file was created to stop losing state across crashes.

## Active Blockers

| Blocker | Owner | Waiting on |
| --- | --- | --- |
| Google Play Console **organization** verification needs a D-U-N-S number; Dun & Bradstreet doesn't issue them in Jamaica. | Geego | Google Play support reply to our request for an alternative verification method (support request drafted, approved, cleared to send). |
| Push delivery on real phones | Geego | `eas init` (writes the EAS projectId into app.json), a Firebase project + `google-services.json` for Android (FCM), and the FCM V1 key uploaded to EAS. Until then the app skips push registration. |
| Apple App Store release | Geego | Apple Developer enrollment ($99/yr) — not started as far as the repo shows. |

## Decisions Made

- **2026-09-25** — Google Play support request for D-U-N-S alternative approved and cleared to
  send. Details on the request: legal name **Clean Crep Jamaica**, registered address **York
  Town P.A., Clarendon, Jamaica**, contact **cleancrepja@gmail.com**.
- **2026-09-25** — Fallback if Google stalls: open an **individual** Google Play developer
  account now and ship under it; **migrate to an organization account** once Google resolves
  verification. (Don't let verification block launch.)
- **2026-09-25** — HANDOFF.md is the single source of session state; CLAUDE.md now requires
  reading it at session start and updating it at session end.
- **2026-09-25** — Growth-transcript filter (batch 1): adopt guest browsing, friendly errors,
  loading/empty/error states, push notifications with a clear reason, and a single rating ask
  after an order is Completed (send happy customers to **Google Maps reviews**, not the store).
  Skip App Clips (iOS-only; Android-first launch; Creppie WhatsApp already covers no-install
  booking).
- **2026-09-25** — Creppie mascot in UI states: build states through one component now, swap
  in mascot art (Lottie + PNG, 5 poses: loading / empty / error / offline / success) later.
- **2026-09-26** — "Phone emulator" = Playwright + Expo web in an emulated Pixel 7 **and iPhone 15
  Pro** (both Chromium) against local Supabase (no KVM in the sandbox, so a real Android emulator can't run). Catches flow/UI/data
  bugs; native-only behaviour still needs a device build.
- **2026-09-26** — Push is sent from Postgres via pg_net (no Edge Function to deploy). Permission
  is asked only after a booking, with an explainer first.
- **2026-09-26** — Creppie art: background-removed cutouts of Geego's 5 renders (512px PNG);
  moods: scrubbing=loading, thumbs-up=success (+sign-in), shrug=empty, no-wifi=offline,
  slipping=error, waving at the door=sign-in (added same day).
- **2026-09-26** — Live Supabase project `clean-crep-jamaica` (`gymchhmohcggvesrsupc`, us-east-1)
  was found **paused** (free-tier inactivity pause) — which also meant Creppie's n8n dual-write
  to Postgres was failing (Airtable copy unaffected). Restored with Geego's OK. EAS
  `preview`/`production` now point at it (URL + publishable key; both public by design, RLS is
  the security boundary). Live DB had 0001–0004 already (applied by hand: 6 services, 2 orders,
  1 customer, 1 staff); **0005 push + 0006 security hardening applied** the same day via the
  Supabase connector. Linter now clean except intended items (is_staff / push RPCs callable by
  design; `service_aliases` read only by a definer function) and leaked-password protection.
- **2026-09-26** — **Supabase Pro (US$25/mo) at launch** so the live DB never pauses; stay on
  free while testing.
- **2026-09-28** — Geego has a **MacBook Air with Xcode 27**; the app runs in the iOS Simulator
  (iPhone 18 Pro Max, iOS 27) via Expo Go against the live Supabase. Setup steps in README
  ("Running on the iOS Simulator"). Xcode 27 replaced Simulator.app with Device Hub, which Expo
  SDK 54 can't find → `patches/@expo+cli+54.0.27.patch` (patch-package, root `postinstall`)
  makes Expo use Simulator when present and fall back to Device Hub. Diagnosed + first patched
  by Cowork on the Mac; made Xcode 26/27-compatible and tested here.
  Desktop launcher (Cowork-built, tested on the Mac): `scripts/mac/Clean Crep.command` —
  auto-pulls, installs only on dependency changes, resets a lockfile-only local diff so pulls
  can't be blocked.
- **2026-09-30** — No new tabs for kits or Clean Crep Club (5 tabs is the max). Kits are sold as
  booking add-ons, paid/collected at the shop (no in-app stock or payments yet). Pickup &
  Delivery is J$1,000 in the app too (was free, Creppie charged it). Add-on prices copied from
  Creppie's list for now; Geego is revisiting all app prices.
- **2026-09-30** — **Clean Crep Club = subscription membership.** Pilot manually first (≈10
  members, monthly bank transfer, tracked outside the app); build billing into the app only if
  members renew. Proposed test offer: J$4,500/mo for 3 sneaker cleans, priority turnaround, 10%
  off kits, no rollover. Paid "DIY cleaning coach" subscription rejected (cannibalises cleans);
  instead Creppie coaching comes free with kits (later).
- **2026-09-30** — Creppie on the website: same n8n workflow as WhatsApp via a server relay (no
  n8n change needed). Creppie inside the app comes after the website version proves out.
- **2026-09-30** — Airtable retired as Creppie's database (free plan ran 3x over its API limit);
  Supabase is the single source of truth for prices, zones, orders and chats. Still to do before
  dropping Airtable entirely: import historical Airtable orders (4) and a Prices & Zones editor in
  the dashboard (5).
- **2026-09-30** — Creppie drop-off date verified on a real IG booking ("Friday" → 2026-10-02).
  Seen in the same test: Creppie skipped the Sole Refresh upsell and didn't repeat the drop-off
  day back — fixed and published the same day (see below).
- **2026-09-30** — cleancrep.com was suspended by Namecheap (unverified registrant email);
  Geego verified it the same day and it's back on Vercel. Creppie upsell fix published: add-on
  offered once per booking (inside the summary if the customer is ready), and the summary always
  states the drop-off / pickup day (n8n `Prompt Tweaks` step; previous version `79f3836c`).
  Real test showed Creppie still skipped the day, so a code step `Polish Reply` (live version
  `2faeee65`) now appends it, and replaces the summary on a re-sent booking with "you're already
  booked" (duplicates were already blocked from the database; per chat only, not per phone).
- **2026-09-30** — Test data cleared from the live dashboard (orders CC-0042/45/46/47, their
  notifications, smoke-test loyalty points); accounts kept. The staff dashboard now starts clean.
- **2026-10-02** — Creppie booking fixes after the first real Creppie booking (CC-0052, Crissy,
  1x Clarks): kits are restocking, so Creppie never offers them (`KITS_RESTOCKING` in n8n
  `Prompt Tweaks`; set it to `false` when stock lands). **Clarks take no add-ons** (no Sole
  Refresh, no Deep Clean; a cap clean is the only extra). Area only asked for CrepRun pickup.
  No drop-off day saves a week out with "Day to confirm" in the notes, not today. Live n8n version
  `54b1cd1e`; export in clean-crep-systems PR #6. CC-0052 moved to Oct 9 + "Day to confirm".
- **2026-10-04** — Growth-transcript filter (batch 2: viral-content list, RevenueCat
  subscriptions, "app #2" AI stack). Adopt: **product analytics (PostHog)** on app + website — we
  have zero funnel data today. Skip: RevenueCat/StoreKit for Clean Crep Club — cleaning is a
  physical service, so store rules let us take payment outside Apple/Google IAP (no 15–30% cut);
  Club stays a manual pilot. Skip Peekly validation (business already validated) and the SwiftUI
  switch (Expo covers both stores). Viral-content playbook goes to @GeegoBuilds, not the app.
- **Earlier (see git log)** — Instagram post templates and the Client Proposal Deck are out of
  scope for this repo. Creppie guest orders are _not_ auto-merged with app accounts (kept
  simple on purpose). Auth is email/password for v1; phone OTP deferred until a Twilio account
  exists.

## Next Steps

1. Run `npm run e2e` after any change; add a check for each new journey.
2. **Push setup (Geego, ~30 min)**: `npx eas init`, create a Firebase project, add
   `google-services.json`, upload the FCM V1 key in EAS, then a `preview` build on your phone to
   see a real "Ready for Pickup" push.
3. **Replace `GOOGLE_REVIEW_URL`** in `apps/mobile/src/components/review-ask.tsx` with the shop's
   direct Google "Write a review" link.
4. Optional: the same Creppie poses as Lottie for subtle animation. Drop-in via `moods.ts`.
5. **Send the Google Play support request** (if not already sent) and log the date + case number.
6. ~7 days after sending with no answer → **enroll the individual developer account** and do the
   first internal-testing build.
7. **Launch week: upgrade Supabase to Pro** (billing in the Supabase dashboard), turn on
   **Auth → Leaked password protection**, then `eas build -p android --profile production`.
8. Keep filtering app-growth transcripts as Geego sends them.
9. **Migration leftovers (Geego's order: 1–3 done 2026-09-30, then 4–6)**:
   4. Import historical Airtable Orders (and optionally Conversations) into Supabase — the
      `airtable_id` columns (0010) make the copy re-runnable.
   5. ~~Prices & Zones page~~ — built 2026-09-30 (`/staff/dashboard/prices`, migration 0012
      for zone edits; apply 0012 to live at merge). Then downgrade Airtable.
   6. ~~Real Instagram test booking → dashboard~~ (passed 2026-09-30); website chat go-live below.
10. Revisit prices in `services` + `add_ons` (Supabase table editor; the app reads them live).
    Sole Refresh is both a service and a J$1,500 add-on (live price J$1,500 on both; Creppie
    only quotes the add-on) — decide whether the app should keep offering it standalone.
11. ~~**Website chat go-live**~~ — live 2026-09-30 (`CREPPIE_WEBHOOK_URL` set on Vercel Production;
    tested on clean-crep-app-web.vercel.app). Was: add `CREPPIE_WEBHOOK_URL` in Vercel →
    Production env, redeploy, test one chat + one booking end to end.
12. **Club pilot**: finalise the offer, sell 10 memberships on WhatsApp.
13. Swap `BOOK_NOW_URL` in `apps/web/src/app/page.tsx` to the Play Store link once listed.

## Gotchas

- **Expo SDK 54 + Xcode 27:** relies on `patches/@expo+cli+54.0.27.patch`. When upgrading Expo
  (SDK 56+ supports Device Hub natively) delete the patch — patch-package fails the install on
  a version mismatch as a reminder. Dev builds on iOS 27 may also need the UIKit scene lifecycle
  change (SDK 54–56); check before the first `eas build -p ios`.
- On a Mac, zsh doesn't treat pasted `# comments` as comments — keep commands comment-free.

- **Live migration history ≠ repo numbering.** 0001–0004 were pasted into the SQL editor (no
  history); later ones were recorded under timestamps: 0005 `20260926221201`, 0006
  `20260926221359`, 0007 `20260930091632`, 0008 `20260930102700`, 0009 `20260930103100`, 0010
  `20260930182330`, 0011 (applied via the connector, check `list_migrations`). Before ever running
  `supabase db push` against live, `supabase migration repair` those timestamps to reverted and
  0001–0011 to applied.
  (Or keep applying new migrations through the Supabase connector, one file at a time.)
- The cloud sandbox's network proxy blocks direct HTTPS to `*.supabase.co`; use the Supabase
  connector (MCP) for anything against the live project.

## Open Questions

- Creppie orders that arrived while the DB was paused exist only in Airtable. Backfill them into
  `orders` (one-off import) or accept the gap?

- **Address mismatch**: registered address on the Google request is York Town P.A., Clarendon;
  the app README and landing page list the shop at Shop 19, Pristine Plaza, Half Way Tree,
  Kingston. Fine if one is legal and one is operating — but confirm which address goes on the
  Play Store listing / developer profile so Google doesn't flag the mismatch.
- **Individual → organization migration**: Google's account-transfer process moves apps
  between developer accounts; confirm the individual account's name/details won't block that
  later (use the same legal identity and contact email).
- Has the Google support request actually been sent? If so, when, and what's the case number?
- Apple: launching iOS at the same time as Android, or Android-first?
- Push follow-up: Expo reports dead tokens (`DeviceNotRegistered`) in its response; nothing
  prunes them yet. Harmless at current volume — revisit if sends grow.
