import { useEffect } from 'react';
import { Tabs, useRouter, type Href } from 'expo-router';
import type { IconName } from '@/components/icon';
import { PillTabBar } from '@/components/pill-tab-bar';
import { ScreenSkeleton } from '@/components/states';
import { useAuth } from '@/lib/auth';
import { useFeatures } from '@/hooks/use-features';
import { onPushTap } from '@/lib/push';

// No auth gate here: guests can browse Home and Book (services are public-read).
// Sign-in is asked for only at Confirm Booking, and Orders/Inbox/Profile show a
// sign-in prompt for guests instead of redirecting.
export default function AppGroupLayout() {
  const router = useRouter();
  const { initializing } = useAuth();
  // Hidden tabs (docs/VISION.md) appear only when their feature flag is on.
  const features = useFeatures();

  // Tapping an order-update push opens the screen it points at (Orders).
  useEffect(() => onPushTap((url) => router.push(url as Href)), [router]);

  if (initializing) return <ScreenSkeleton />;

  const tabs: { name: string; label: string; icon: IconName }[] = [
    { name: 'index', label: 'Home', icon: 'home' },
    { name: 'book', label: 'Book', icon: 'book' },
    { name: 'orders', label: 'Orders', icon: 'orders' },
    ...(features.has('vault') ? [{ name: 'vault', label: 'Vault', icon: 'vault' as IconName }] : []),
    { name: 'inbox', label: 'Inbox', icon: 'bell' },
    { name: 'profile', label: 'Profile', icon: 'profile' },
  ];

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <PillTabBar {...props} tabs={tabs} />}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="book" options={{ title: 'Book' }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
      <Tabs.Screen name="vault" options={{ title: 'Vault', href: features.has('vault') ? undefined : null }} />
      <Tabs.Screen name="club" options={{ href: null }} />
      <Tabs.Screen name="inbox" options={{ title: 'Inbox' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
