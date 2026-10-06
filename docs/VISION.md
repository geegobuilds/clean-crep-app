# Clean Crep — Vision

Goal: the best sneaker-care app in the world, not just a booking app. Every pair a customer owns
lives in the app, carries a history, and gets cared for on a rhythm. The cleaning service is the
way in; the Vault, the Passport and the membership are why people stay and pay monthly.

All figures (prices, credits, thresholds) are placeholders and change freely in the database
without a code release.

## The pieces

1. **The Vault (free).** Every pair you've had cleaned shows up automatically (from orders), and
   you can add the rest. Brand, model, colorway, size, nickname, rough value. Free on purpose: it
   is the reason to open the app between cleans, and the membership is sold from inside it.
2. **Crep Passport.** Every pair gets an 8-character code (e.g. `7KQ4M2XR`) and a public page
   `cleancrep.com/p/<code>` with its clean history, photo count and condition grades — no owner
   details. Printed on a QR Crep Tag in the box. Resale proof ("cleaned 6× by Clean Crep") and
   free marketing every time a pair changes hands.
3. **AI condition grade.** Before/after photos (migration 0019) scored 1–10 per pair, every clean.
   Shows the pair getting better (or when it needs a deep clean / sole refresh — an upsell with
   evidence).
4. **Care membership.** Monthly care credits, not "unlimited". Draft plans: Club J$5,000 / 3
   credits, Sneakerhead J$9,800 / 4, Household J$14,000 / 6 shared by up to 4 people. Credits roll
   over (capped), memberships can be gifted. Paid by bank transfer / Lynk / cash first; card later.
   Every credit movement is a ledger row, so balances are auditable.
5. **Smart nudges.** Builds on "Due for a clean" (0017/0018): per-pair rhythm, weather (rainy
   week → book now), and members who haven't used credits.
6. **Creppie in the Vault.** Ask about a specific pair ("can my suede Clarks handle rain?") with
   its history as context.
7. **Share cards + referral.** Before/after card for TikTok/IG with a referral code baked in.
8. **Fresh Pairs.** Later: verified pre-owned pairs sold with their Passport.

## How we ship it

Everything ships dark behind a feature flag (`feature_flags`, migration 0020). Staff always see
everything; a customer's email can be added as a tester from Staff › Features; "On for everyone"
is the launch switch. Nothing appears on the website until launched.

| Phase | What | Flag |
|---|---|---|
| 0 ✅ | Flags, pairs + passport codes, pair events, membership tables + credit ledger (no UI) | — |
| 1 ✅ | Vault + Passport screens, pairs auto-created from orders, `/p/<code>` page, Crep Tags | `vault`, `passport` |
| 2 ✅ | AI condition grade on staff photo upload | `condition_grade` |
| 3 🔨 | Membership: sign-up, credit redemption at booking, monthly grant job, gifting | `membership` |
| 4 | Smart nudges + Creppie in the Vault | `smart_nudges` |
| 5 | Fresh Pairs | `fresh_pairs` |
