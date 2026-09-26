import { useEffect } from 'react';
import type { ColorValue } from 'react-native';
import { Tabs, useRouter, type Href } from 'expo-router';
import { colors } from '@clean-crep/shared';
import { Icon, type IconName } from '@/components/icon';
import { ScreenSkeleton } from '@/components/states';
import { useAuth } from '@/lib/auth';
import { onPushTap } from '@/lib/push';

function TabBarIcon({ iconName, color }: { iconName: IconName; color: ColorValue }) {
  return <Icon name={iconName} size={22} color={color as string} />;
}

// No auth gate here: guests can browse Home and Book (services are public-read).
// Sign-in is asked for only at Confirm Booking, and Orders/Inbox/Profile show a
// sign-in prompt for guests instead of redirecting.
export default function AppGroupLayout() {
  const router = useRouter();
  const { initializing } = useAuth();

  // Tapping an order-update push opens the screen it points at (Orders).
  useEffect(() => onPushTap((url) => router.push(url as Href)), [router]);

  if (initializing) return <ScreenSkeleton />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.caption,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 78,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: 'DMSans_400Regular', fontSize: 10 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <TabBarIcon iconName="home" color={color} /> }} />
      <Tabs.Screen name="book" options={{ title: 'Book', tabBarIcon: ({ color }) => <TabBarIcon iconName="book" color={color} /> }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: ({ color }) => <TabBarIcon iconName="orders" color={color} /> }} />
      <Tabs.Screen name="inbox" options={{ title: 'Inbox', tabBarIcon: ({ color }) => <TabBarIcon iconName="bell" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <TabBarIcon iconName="profile" color={color} /> }} />
    </Tabs>
  );
}
