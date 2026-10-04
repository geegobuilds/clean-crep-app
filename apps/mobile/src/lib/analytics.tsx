import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'expo-router';
import PostHog, { PostHogProvider } from 'posthog-react-native';

// Product analytics (PostHog). Event names and properties are shared with the
// website (apps/web/src/lib/analytics.ts) so one funnel covers both.
//
// Privacy rule: never send email, phone, names or free text. People are
// identified by their Supabase user id only.
//
// No EXPO_PUBLIC_POSTHOG_KEY (local dev, `npm run e2e`, CI) → no client is
// created and every call below is a no-op.

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

export const posthog: PostHog | null = KEY
  ? new PostHog(KEY, {
      host: HOST,
      // Only signed-in customers get a person profile; guests stay anonymous.
      personProfiles: 'identified_only',
    })
  : null;

// Every event carries platform=app so funnels can be split app vs web.
posthog?.register({ platform: 'app' });

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

export function track(event: AnalyticsEvent, props?: Props) {
  posthog?.capture(event, props);
}

/** Link this device's events to the customer. User id only, no traits. */
export function identify(userId: string) {
  if (posthog && posthog.getDistinctId() !== userId) posthog.identify(userId);
}

export function resetAnalytics() {
  posthog?.reset();
  posthog?.register({ platform: 'app' });
}

/** expo-router hides the NavigationContainer, so screens are tracked from the URL path. */
function ScreenTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) posthog?.screen(pathname);
  }, [pathname]);
  return null;
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  if (!posthog) return <>{children}</>;
  return (
    // Screen autocapture doesn't work with expo-router (see ScreenTracker);
    // touches stay off so no on-screen text is ever captured.
    <PostHogProvider client={posthog} autocapture={{ captureScreens: false, captureTouches: false }}>
      <ScreenTracker />
      {children}
    </PostHogProvider>
  );
}
