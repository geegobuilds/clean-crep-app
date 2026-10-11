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
      <Animated.View entering={FadeInDown.springify().damping(16)}>
        {/* The whole pill is the End button: a 44pt target, not a tiny chip. */}
        <Pressable
          testID="tour-banner"
          accessibilityRole="button"
          accessibilityLabel="Tour with sample data. End the tour"
          onPress={async () => {
            tapLight();
            await endTour();
            router.replace('/');
          }}
          style={[{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: space.xs, backgroundColor: c.navy, borderRadius: radius.pill, paddingLeft: space.md, paddingRight: 6 }, elevation.raised]}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.white }} />
          <Text style={[type.caption, { color: c.white, fontFamily: type.bodyStrong.fontFamily }]}>Tour · sample data</Text>
          <View testID="tour-end" style={{ backgroundColor: c.white, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: space.md, marginLeft: space.xxs }}>
            <Text style={[type.caption, { color: c.accent, fontFamily: type.bodyStrong.fontFamily }]}>End</Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}
