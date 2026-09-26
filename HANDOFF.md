# HANDOFF

Running state of the Clean Crep App build. Read this first every session; update it at the
end of any session where something meaningful changed. Keep it short — this is a status
board, not a history (git log is the history).

_Last updated: 2026-09-26_

## Current Status

- **Code**: Expo customer app (`apps/mobile`), Next.js landing page + staff dashboard
  (`apps/web`), and Supabase schema (`supabase/migrations/0001`–`0004`) are built on `main`.
  Latest shipped work: staff password-reset page, password-recovery race fix, Creppie orders
  labelled by system name in the dashboard.
- **Pre-launch UX fixes (PR open, 2026-09-25)**: guest browsing (sign-in only at Confirm
  Booking, via an in-screen sheet that keeps the booking), friendly error copy
  (`apps/mobile/src/lib/errors.ts` — no raw Supabase/JS errors on screen), and skeleton /
  empty / error-with-retry states on every data screen (`apps/mobile/src/components/states.tsx`).
  Also: customers profile row is now auto-created on first sign-in (fixes bookings failing for
  accounts created while email confirmation is on).
- **Same PR, added 2026-09-26**:
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
    via `moods.ts`. Sign-in reuses the thumbs-up pose until a wave pose exists.
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
| Production build env: `apps/mobile/eas.json` `preview` / `production` profiles still have `EXPO_PUBLIC_SUPABASE_URL` / `ANON_KEY` set to `set-me`. | Geego | Hosted Supabase project URL + anon key to paste in (or set as EAS secrets) before the first real build. |
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
- **2026-09-26** — "Phone emulator" = Playwright + Expo web in an emulated Pixel 7 against local
  Supabase (no KVM in the sandbox, so a real Android emulator can't run). Catches flow/UI/data
  bugs; native-only behaviour still needs a device build.
- **2026-09-26** — Push is sent from Postgres via pg_net (no Edge Function to deploy). Permission
  is asked only after a booking, with an explainer first.
- **2026-09-26** — Creppie art: background-removed cutouts of Geego's 5 renders (512px PNG);
  moods: scrubbing=loading, thumbs-up=success (+sign-in), shrug=empty, no-wifi=offline,
  slipping=error.
- **Earlier (see git log)** — Instagram post templates and the Client Proposal Deck are out of
  scope for this repo. Creppie guest orders are _not_ auto-merged with app accounts (kept
  simple on purpose). Auth is email/password for v1; phone OTP deferred until a Twilio account
  exists.

## Next Steps

1. **Review + merge PR #2** (pre-launch UX + phone checks + push + review ask + Creppie slot).
   Run `npm run e2e` after any change; add a check for each new journey.
2. **Push setup (Geego, ~30 min)**: `npx eas init`, create a Firebase project, add
   `google-services.json`, upload the FCM V1 key in EAS, then a `preview` build on your phone to
   see a real "Ready for Pickup" push.
3. **Replace `GOOGLE_REVIEW_URL`** in `apps/mobile/src/components/review-ask.tsx` with the shop's
   direct Google "Write a review" link.
4. Optional: a 6th Creppie pose (waving at the shop door) for the sign-in prompts, and the
   same poses as Lottie for subtle animation. Drop-in via `moods.ts`.
5. **Send the Google Play support request** (if not already sent) and log the date + case number.
6. ~7 days after sending with no answer → **enroll the individual developer account** and do the
   first internal-testing build.
7. Stand up hosted Supabase (`supabase db push` applies 0001–0005, enable `pg_net`) + fill the
   EAS production env, then `eas build -p android`.
8. Keep filtering app-growth transcripts as Geego sends them.
9. Swap `BOOK_NOW_URL` in `apps/web/src/app/page.tsx` to the Play Store link once listed.

## Open Questions

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
