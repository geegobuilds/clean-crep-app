import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { advance, resetTour } from './backend';
import { emitTourChange, tour, TOUR_EMAIL, TOUR_ENABLED } from './state';

// supabase-js keeps the session under sb-<project ref>-auth-token.
const REAL_SESSION_KEY = `sb-${(() => {
  try {
    return new URL(process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').hostname.split('.')[0];
  } catch {
    return '';
  }
})()}-auth-token`;

let ticker: ReturnType<typeof setInterval> | null = null;

function stopTour() {
  if (ticker) clearInterval(ticker);
  ticker = null;
  tour.set(false);
}

/** Sign in as the tour's sample customer (on a fresh copy of the sample data). */
export async function startTour() {
  if (!TOUR_ENABLED || tour.active) return;
  resetTour();
  tour.set(true);
  // Orders booked on the tour move along on their own; this nudges the screens.
  ticker = setInterval(() => {
    if (advance()) emitTourChange();
  }, 5000);
  const { error } = await supabase.auth.signInWithPassword({ email: TOUR_EMAIL, password: 'tour' });
  if (error) stopTour();
}

/** Leave the tour and, if someone was signed in on this phone, bring them back. */
export async function endTour() {
  if (!tour.active) return;
  await supabase.auth.signOut({ scope: 'local' });
  stopTour();
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(REAL_SESSION_KEY)) ?? 'null') as { access_token?: string; refresh_token?: string } | null;
    if (saved?.access_token && saved.refresh_token) {
      await supabase.auth.setSession({ access_token: saved.access_token, refresh_token: saved.refresh_token });
    }
  } catch {
    // No saved session (or unreadable): the phone is simply signed out.
  }
}
