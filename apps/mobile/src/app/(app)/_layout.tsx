import type { ColorValue } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { colors } from '@clean-crep/shared';
import { Icon, type IconName } from '@/components/icon';
import { useAuth } from '@/lib/auth';

function TabBarIcon({ iconName, color }: { iconName: IconName; color: ColorValue }) {
  return <Icon name={iconName} size={22} color={color as string} />;
}

export default function AppGroupLayout() {
  const { session, initializing } = useAuth();
  if (initializing) return null;
  if (!session) return <Redirect href="/sign-in" />;

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
