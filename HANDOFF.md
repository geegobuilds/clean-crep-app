# HANDOFF

Running state of the Clean Crep App build. Read this first every session; update it at the
end of any session where something meaningful changed. Keep it short — this is a status
board, not a history (git log is the history).

_Last updated: 2026-09-25_

## Current Status

- **Code**: Expo customer app (`apps/mobile`), Next.js landing page + staff dashboard
  (`apps/web`), and Supabase schema (`supabase/migrations/0001`–`0004`) are built on `main`.
  Latest shipped work: staff password-reset page, password-recovery race fix, Creppie orders
  labelled by system name in the dashboard.
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
- **Earlier (see git log)** — Instagram post templates and the Client Proposal Deck are out of
  scope for this repo. Creppie guest orders are _not_ auto-merged with app accounts (kept
  simple on purpose). Auth is email/password for v1; phone OTP deferred until a Twilio account
  exists.

## Next Steps

1. **Send the Google Play support request** (if not already sent) and log the send date +
   ticket/case number here.
2. Set a deadline for Google's reply (suggest ~7 days from send). If no useful answer by then,
   **enroll the individual developer account** and proceed to first internal-testing build.
3. Filter the app-growth video transcripts (Geego to share) for tactics that actually transfer
   to a hyper-local, single-shop service app; turn survivors into concrete tasks here.
4. Stand up hosted Supabase + fill the EAS production env, then `eas build -p android`.
5. Swap `BOOK_NOW_URL` in `apps/web/src/app/page.tsx` from WhatsApp to the Play Store link
   once the listing exists.

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
