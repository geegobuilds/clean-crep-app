import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Tabs } from 'expo-router';
import Animated, { LinearTransition } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Icon, type IconName } from '@/components/icon';
import { TourBanner } from '@/components/tour-banner';
import { tapLight } from '@/lib/haptics';
import { c, elevation, radius, space, type } from '@/theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const FADE = 96;

/**
 * Floating pill tab bar (DESIGN.md §8): a white capsule that floats over the
 * content (which scrolls on underneath, behind a soft fade); the active tab
 * grows into a navy pill with its label, the rest are icons only. `tabs` lists
 * the visible routes in order with their icons (hidden routes such as /club, or
 * flags that are off, are simply left out). A screen hides the bar with
 * `tabBarStyle: { display: 'none' }` (Club, the booking details step).
 */
export function PillTabBar({ state, descriptors, navigation, tabs }: TabBarProps & { tabs: { name: string; label: string; icon: IconName }[] }) {
  const insets = useSafeAreaInsets();
  const focusedRoute = state.routes[state.index];
  const current = focusedRoute?.name;
  const style = focusedRoute ? (descriptors[focusedRoute.key]?.options.tabBarStyle as { display?: string } | undefined) : undefined;
  if (style?.display === 'none') return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      {/* Content fades out under the bar instead of stopping at a hard edge. */}
      <Svg pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} width="100%" height={FADE + insets.bottom}>
        <Defs>
          <LinearGradient id="tabfade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.bg} stopOpacity="0" />
            <Stop offset="0.55" stopColor={c.bg} stopOpacity="0.92" />
            <Stop offset="1" stopColor={c.bg} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={FADE + insets.bottom} fill="url(#tabfade)" />
      </Svg>
    <View style={{ paddingHorizontal: space.md, paddingTop: space.xs, paddingBottom: Math.max(insets.bottom, space.sm) }}>
      <TourBanner />
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
    </View>
  );
}
