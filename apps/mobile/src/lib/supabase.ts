import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSupabaseClient } from '@clean-crep/shared';
import { tour } from '@/lib/tour/state';
import { tourFetch } from '@/lib/tour/backend';

// Tour mode (lib/tour) swaps the network and the session store: while it's on,
// every request is answered from sample data and the tour's session lives in
// memory, so the real signed-in session on this phone is never touched.
const tourStore = new Map<string, string>();
const storage = {
  getItem: (k: string) => (tour.active ? Promise.resolve(tourStore.get(k) ?? null) : AsyncStorage.getItem(k)),
  setItem: (k: string, v: string) => (tour.active ? Promise.resolve(void tourStore.set(k, v)) : AsyncStorage.setItem(k, v)),
  removeItem: (k: string) => (tour.active ? Promise.resolve(void tourStore.delete(k)) : AsyncStorage.removeItem(k)),
};

export const supabase = createSupabaseClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) => (tour.active ? tourFetch(input, init) : fetch(input, init)),
    },
  }
);
