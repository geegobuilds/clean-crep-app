'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Supabase's admin-triggered "send password recovery" email always redirects
 * to the project's configured Site URL root, not a specific path. This
 * catches the recovery session wherever it lands and forwards to the actual
 * reset-password form.
 */
export function RecoveryRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/auth/reset-password') return;
    // Constructing the client kicks off Supabase's own detectSessionInUrl
    // handling of the recovery token below.
    const supabase = createClient();

    // onAuthStateChange below can race the client's own URL-session
    // detection on first page load — the PASSWORD_RECOVERY event has been
    // observed firing before this listener finishes attaching. Checking the
    // URL directly is a synchronous fallback that doesn't depend on event
    // timing.
    const hasRecoveryMarker =
      window.location.hash.includes('type=recovery') ||
      new URLSearchParams(window.location.search).get('type') === 'recovery';
    if (hasRecoveryMarker) {
      router.replace('/auth/reset-password');
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/auth/reset-password');
      }
    });
    return () => subscription.unsubscribe();
  }, [pathname, router]);

  return null;
}
