# Legal + security audit (Oct 8, 2026)

This is a run of the "10 legal traps in vibe-coded apps" checklist against this repo and the
live Supabase project (`gymchhmohcggvesrsupc`). **It is not legal advice.**

The business, its customers and its data are in Jamaica. The law that applies most directly is
Jamaica's **Data Protection Act, 2020**. Most of the US/EU penalties in the checklist don't
apply directly, but the Apple App Store and Google Play rules apply wherever you are.

## Results

| # | Check | Status | Where |
|---|---|---|---|
| 1 | RLS on every table, no secrets in client code | ✅ Pass, with one small leak (see Fix 3) | Every `public` table has RLS on. `order-photos` bucket is private. The client only gets the URL, anon key and PostHog key. The Anthropic key is server-side only (`apps/web/src/app/api/*`). |
| 2 | Privacy policy matches what we collect, linked in footer, signup and app | ❌ **Fail** | `apps/web/src/app/privacy/page.tsx` (last updated Aug 27): see Fix 1. Linked only from the website footer (`apps/web/src/app/page.tsx:331`). Not linked from the app or the sign-up form. |
| 3 | Age gate if under-13s are likely | ➖ N/A | Not a kid-directed service. |
| 4 | No analytics/replay/pixels before consent, never on form/chat/payment fields | ⚠️ Mostly OK | PostHog (`apps/web/src/lib/analytics.ts`, `apps/mobile/src/lib/analytics.tsx`) runs without a consent prompt, but with session recording off, autocapture off, URLs scrubbed and `/staff` excluded. No Meta Pixel. The real gap is disclosure: the policy says "no tracking cookies". |
| 5 | Marketing messages: unsubscribe + postal address | ⚠️ Check | No marketing email. "Due for a clean" reactivation sends **marketing pushes** (`supabase/migrations/0017_due_for_a_clean.sql`). Make sure Profile › Notifications turns them off. |
| 6 | Subscription terms next to pay, confirmation, easy cancel | ⚠️ Low risk | The Club (`apps/mobile/src/app/(app)/club.tsx`) has no auto-charge: members pay by hand each month and it shows "No contracts… Stop any time". Missing: Club terms on `/terms` (credit rollover, household sharing, refunds). |
| 7 | Chatbot says it's AI in its first message | ❌ **Fail** | The greeting says "Clean Crep's assistant" in `apps/web/src/components/creppie-chat.tsx:13` and `apps/mobile/src/components/creppie-chat.tsx:18`. On Instagram it depends on the prompt (it says it's AI only if asked). |
| 8 | WCAG basics: alt text, labels, keyboard, contrast | ⚠️ Partial | Web images all have alt text. 37 web `<button>`s have no `aria-label` (most have visible text). Only 11 of 35 mobile `Pressable`s have an `accessibilityLabel`. |
| 9 | DMCA agent if users upload content | ➖ N/A | Only staff upload photos. |
| 10 | Third-party scripts/fonts listed, self-hosted where possible | ⚠️ List them in the policy | DM Sans comes in via `next/font`, which self-hosts it at build time ✅. Services used: Supabase, Vercel, PostHog (US), Anthropic/Claude (Creppie chat + photo condition grade), n8n, ManyChat/Instagram, Gmail (auth emails), Expo push. |

## Fixes, in order

1. **Rewrite the privacy policy** and link it from the app (Profile) and the sign-up form. Cover:
   - Creppie chats: stored, and processed by Anthropic's Claude.
   - Instagram/ManyChat messages.
   - Order photos, and the AI condition grade.
   - Club membership and payment references.
   - Push tokens and reactivation pushes.
   - PostHog analytics: what's sent, with no names, emails or phones.
   - Website guest bookings, and how they're claimed by email.
   - The public Crep Passport page. It is opt-in and shows only pair history, no personal data.
   - Data stored outside Jamaica (Supabase, PostHog, Anthropic, Vercel).
   - How to request deletion.

   App Store and Play both need a privacy policy URL.
2. **AI disclosure:** greeting → "I'm Creppie, Clean Crep's AI assistant". Also add a rule to the
   n8n `Prompt Tweaks` so that the first Instagram reply always says Creppie is an AI assistant.
3. **`membership_credit_balance(p_membership_id)`** can be called by any signed-in user for any
   membership id. It doesn't check staff or ownership. The impact is low (it reveals a number,
   and the id is a UUID), but it should check `is_membership_viewer()`.
4. **Leaked-password protection:** turn it on with the Supabase Pro upgrade (already a launch-week step).
5. **Terms:** add a Club section (credits, rollover, household, cancellation, refunds).
6. **Accessibility pass:** add `accessibilityLabel` to icon-only buttons in the app.

## Geego's own to-dos (not code)

- Check whether Clean Crep must **register with Jamaica's Office of the Information Commissioner**
  as a data controller under the DPA, and note the DPA's breach-notification duty. Confirm both with a lawyer.
