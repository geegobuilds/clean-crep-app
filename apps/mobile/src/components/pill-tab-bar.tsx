import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Tabs } from 'expo-router';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Icon, type IconName } from '@/components/icon';
import { tapLight } from '@/lib/haptics';
import { c, elevation, radius, space, type } from '@/theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/**
 * Floating pill tab bar (DESIGN.md §8): a white capsule above the content; the
 * active tab grows into a navy pill with its label, the rest are icons only.
 * `tabs` lists the visible routes in order with their icons (hidden routes such
 * as /club, or flags that are off, are simply left out).
 */
export function PillTabBar({ state, navigation, tabs }: TabBarProps & { tabs: { name: string; label: string; icon: IconName }[] }) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  return (
    <View style={{ paddingHorizontal: space.md, paddingTop: space.xs, paddingBottom: Math.max(insets.bottom, space.sm), backgroundColor: 'transparent' }}>
      <View
        style={[
          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.surface, borderRadius: radius.pill, padding: 6 },
          elevation.raised,
        ]}
      >
        {tabs.map((t) => {
          const route = state.routes.find((r) => r.name === t.name);
          if (!route) return null;
          const focused = current === t.name;
          return (
            <Pressable
              key={t.name}
              testID={`tab-${t.name}`}
              accessibilityRole="tab"
              aria-selected={focused}
              accessibilityLabel={t.label}
              onPress={() => {
                tapLight();
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
            >
              <Animated.View
                layout={LinearTransition.springify().damping(18)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  height: 46,
                  paddingHorizontal: focused ? 16 : 12,
                  borderRadius: radius.pill,
                  backgroundColor: focused ? c.navy : 'transparent',
                }}
              >
                <Icon name={t.icon} size={20} color={focused ? c.white : c.inkMuted} />
                {focused && <Text style={[type.caption, { color: c.white, fontFamily: type.bodyStrong.fontFamily }]}>{t.label}</Text>}
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
