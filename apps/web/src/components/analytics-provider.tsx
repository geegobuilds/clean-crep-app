'use client';

import { useEffect } from 'react';
import { initAnalytics } from '@/lib/analytics';

/** Starts PostHog in the browser (no-op without NEXT_PUBLIC_POSTHOG_KEY). */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAnalytics();
  }, []);
  return <>{children}</>;
}
