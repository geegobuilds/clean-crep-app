import { Redirect, Stack, useGlobalSearchParams, type Href } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { ScreenSkeleton } from '@/components/states';

// Only in-app tab routes are valid post-sign-in destinations (?next=/orders etc).
const NEXT_ROUTES = ['/', '/book', '/orders', '/inbox', '/profile'] as const;

export default function AuthGroupLayout() {
  const { session, initializing } = useAuth();
  const { next } = useGlobalSearchParams<{ next?: string }>();
  if (initializing) return <ScreenSkeleton />;
  if (session) {
    const target = NEXT_ROUTES.find((r) => r === next) ?? '/';
    return <Redirect href={target as Href} />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
