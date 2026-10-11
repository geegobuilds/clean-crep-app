import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTourActive } from '@/lib/tour/state';
import { endTour } from '@/lib/tour/control';
import { tapLight } from '@/lib/haptics';
import { c, elevation, radius, space, type } from '@/theme';

/** While the tour runs: a quiet pill that says so, with the way out. Sits on top of the tab bar. */
export function TourBanner() {
  const active = useTourActive();
  const router = useRouter();
  if (!active) return null;
  return (
    <View pointerEvents="box-none" style={{ alignItems: 'center', paddingBottom: space.xs }}>
      <Animated.View
        entering={FadeInDown.springify().damping(16)}
        testID="tour-banner"
        style={[{ flexDirection: 'row', alignItems: 'center', gap: space.xs, backgroundColor: c.navy, borderRadius: radius.pill, paddingLeft: space.sm, paddingRight: 4, paddingVertical: 4 }, elevation.raised]}
      >
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.white }} />
        <Text style={[type.caption, { color: c.white, fontFamily: type.bodyStrong.fontFamily }]}>Tour · sample data</Text>
        <Pressable
          testID="tour-end"
          accessibilityRole="button"
          accessibilityLabel="End the tour"
          hitSlop={8}
          onPress={async () => {
            tapLight();
            await endTour();
            router.replace('/');
          }}
          style={{ backgroundColor: c.white, borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: space.sm }}
        >
          <Text style={[type.caption, { color: c.accent, fontFamily: type.bodyStrong.fontFamily }]}>End</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
