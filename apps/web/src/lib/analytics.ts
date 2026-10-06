'use client';

import type { CaptureResult } from 'posthog-js';

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

// PostHog's script is ~60 KB and was the biggest cost on first load (mobile
// Lighthouse). It's now imported only after the page has loaded and the
// browser is idle; events fired before that wait in a queue, so nothing is lost.
type PostHog = typeof import('posthog-js').default;
let client: PostHog | null = null;
let loading = false;
const queue: ((ph: PostHog) => void)[] = [];

function load() {
  if (loading || !KEY || typeof window === 'undefined') return;
  loading = true;
  import('posthog-js').then(({ default: posthog }) => {
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
    client = posthog;
    queue.splice(0).forEach((fn) => fn(posthog));
  });
}

/** Schedules PostHog after the page has loaded (no-op without NEXT_PUBLIC_POSTHOG_KEY). */
export function initAnalytics() {
  if (loading || !KEY || typeof window === 'undefined') return;
  const idle = () => ('requestIdleCallback' in window ? window.requestIdleCallback(() => load(), { timeout: 3000 }) : setTimeout(load, 1500));
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle, { once: true });
}

function withClient(fn: (ph: PostHog) => void) {
  if (!KEY || typeof window === 'undefined') return;
  if (client) fn(client);
  else {
    queue.push(fn);
    initAnalytics();
  }
}

export function track(event: AnalyticsEvent, props?: Props) {
  withClient((ph) => ph.capture(event, props));
}

/** Link this browser's events to the customer. User id only, no traits. Calls onNewSignIn when this browser wasn't already this user. */
export function identify(userId: string, onNewSignIn?: () => void) {
  withClient((ph) => {
    if (ph.get_distinct_id() === userId) return;
    ph.identify(userId);
    onNewSignIn?.();
  });
}
