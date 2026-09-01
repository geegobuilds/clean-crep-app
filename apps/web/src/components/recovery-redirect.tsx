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
    const supabase = createClient();
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
