'use client';

import posthog, { type CaptureResult } from 'posthog-js';

// Product analytics (PostHog). Event names and properties are shared with the
// app (apps/mobile/src/lib/analytics.tsx) so one funnel covers both.
//
// Privacy rule: never send email, phone, names or free text. People are
// identified by their Supabase user id only.
//
// No NEXT_PUBLIC_POSTHOG_KEY (local dev, CI, preview deploys without it) →
// PostHog is never initialised and every call below is a no-op.

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '';
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

let ready = false;

export type AnalyticsEvent =
  | 'booking_started'
  | 'addon_toggled'
  | 'pickup_zone_selected'
  | 'signin_prompted'
  | 'signin_completed'
  | 'booking_confirmed'
  | 'creppie_chat_opened'
  | 'creppie_message_sent'
  | 'review_ask_shown'
  | 'review_ask_tapped';

type Props = Record<string, string | number | boolean | null>;

// Auth links put tokens in the URL (?code=, ?token_hash=, #access_token=…).
// Strip query strings and fragments from every URL PostHog would record.
const URL_PROPS = ['$current_url', '$referrer', '$initial_referrer', '$initial_current_url'];

function cleanUrl(v: unknown): unknown {
  if (typeof v !== 'string' || !v.startsWith('http')) return v;
  try {
    const u = new URL(v);
    return `${u.origin}${u.pathname}`;
  } catch {
    return v;
  }
}

function scrub(event: CaptureResult | null): CaptureResult | null {
  if (!event) return null;
  // The staff dashboard shows customer names and phones: never track it.
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/staff')) return null;
  for (const bag of [event.properties, event.$set, event.$set_once]) {
    if (!bag) continue;
    for (const k of URL_PROPS) if (k in bag) bag[k] = cleanUrl(bag[k]);
  }
  return event;
}

export function initAnalytics() {
  if (ready || !KEY || typeof window === 'undefined') return;
  posthog.init(KEY, {
    api_host: HOST,
    defaults: '2025-05-24', // pageviews on client-side route changes (App Router)
    person_profiles: 'identified_only',
    autocapture: false, // only our named events: no clicked text, no form contents
    disable_session_recording: true,
    disable_surveys: true,
    before_send: scrub,
  });
  posthog.register({ platform: 'web' });
  ready = true;
}

export function track(event: AnalyticsEvent, props?: Props) {
  initAnalytics(); // child effects run before the provider's, so start lazily too
  if (ready) posthog.capture(event, props);
}

/** Link this browser's events to the customer. User id only, no traits. Returns true on a new sign-in. */
export function identify(userId: string): boolean {
  initAnalytics();
  if (!ready || posthog.get_distinct_id() === userId) return false;
  posthog.identify(userId);
  return true;
}
