import { useSyncExternalStore } from 'react';

// Tour mode: the app runs on built-in sample data (./backend.ts) so Geego and
// testers can see every screen working without touching the live database,
// analytics, WhatsApp or push. Preview builds only (EXPO_PUBLIC_TOUR=1, set in
// eas.json "preview"); the store build never shows the way in.

export const TOUR_ENABLED = process.env.EXPO_PUBLIC_TOUR === '1';
export const TOUR_EMAIL = 'tour@cleancrep.com';

let active = false;
const listeners = new Set<() => void>();

export const tour = {
  get active() {
    return active;
  },
  set(on: boolean) {
    if (on === active) return;
    active = on;
    listeners.forEach((l) => l());
  },
};

export function useTourActive(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => active,
    () => active
  );
}

// The tour has no realtime: the sample backend calls this after every change
// (a booking, an order moving along) and the data hooks reload.
const changeListeners = new Set<() => void>();
export function onTourChange(l: () => void): () => void {
  changeListeners.add(l);
  return () => changeListeners.delete(l);
}
export function emitTourChange() {
  changeListeners.forEach((l) => l());
}
