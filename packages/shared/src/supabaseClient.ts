import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared factory so mobile (Expo) and web (Next.js) construct their
 * Supabase client the same way, against the same schema. Each app supplies
 * its own url/anonKey (from its own env system) and storage adapter
 * (AsyncStorage on native, browser storage on web).
 */
export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: Parameters<typeof createClient>[2]
): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase url/anonKey. Set EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY ' +
        '(mobile) or NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (web).'
    );
  }
  return createClient(url, anonKey, options);
}
