import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { fontFamily } from '@clean-crep/shared';
import { Icon } from '@/components/icon';
import { ShareButton } from '@/components/share-card';
import { tapLight } from '@/lib/haptics';
import { c, elevation, radius, space, spring, type } from '@/theme';

/**
 * Drag to compare: the "after" photo fills the frame and the "before" photo is
 * revealed from the left up to the handle. A small peek on mount hints that it
 * moves. Share sends a watermarked side-by-side card.
 */
export function BeforeAfter({ before, after, itemName, orderNumber }: { before: string; after: string; itemName: string; orderNumber: string }) {
  const [w, setW] = useState(0);
  const pos = useSharedValue(0); // px from the left

  useEffect(() => {
    if (!w) return;
    pos.value = w / 2;
    // Peek: nudge left then settle in the middle.
    pos.value = withDelay(500, withSequence(withTiming(w * 0.3, { duration: 380 }), withSpring(w / 2, spring)));
  }, [w, pos]);

  const clamp = (x: number) => {
    'worklet';
    return Math.max(0, Math.min(x, w));
  };
  const pan = Gesture.Pan()
    .onBegin((e) => {
      pos.set(clamp(e.x));
    })
    .onUpdate((e) => {
      pos.set(clamp(e.x));
    });
  const tap = Gesture.Tap().onEnd((e) => {
    pos.set(withSpring(clamp(e.x), spring));
  });

  const clipStyle = useAnimatedStyle(() => ({ width: pos.value }));
  const handleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pos.value - 22 }] }));

  return (
    <View style={{ gap: space.sm }}>
      <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
        <View
          testID="before-after"
          accessibilityLabel={`Before and after photos of your ${itemName}. Drag to compare.`}
          onLayout={(e) => setW(e.nativeEvent.layout.width)}
          style={[{ aspectRatio: 4 / 5, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: c.ice }, elevation.card]}
        >
          <Image source={{ uri: after }} style={{ position: 'absolute', top: 0, left: 0, width: w, height: '100%' }} resizeMode="cover" />
          <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, overflow: 'hidden' }, clipStyle]}>
            <Image source={{ uri: before }} style={{ width: w, height: '100%' }} resizeMode="cover" />
          </Animated.View>

          <Pill text="Before" style={{ left: space.sm }} />
          <Pill text="After" style={{ right: space.sm }} />

          <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, bottom: 0, width: 44, alignItems: 'center' }, handleStyle]}>
            <View style={{ flex: 1, width: 3, backgroundColor: c.white }} />
            <View
              style={[
                { position: 'absolute', top: '50%', marginTop: -22, width: 44, height: 44, borderRadius: 22, backgroundColor: c.white, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
                elevation.raised,
              ]}
            >
              <Icon name="chevronL" size={16} color={c.navy} strokeWidth={2.5} />
              <Icon name="chevronR" size={16} color={c.navy} strokeWidth={2.5} />
            </View>
          </Animated.View>
        </View>
      </GestureDetector>
      <ShareButton before={before} after={after} itemName={itemName} orderNumber={orderNumber} onPress={tapLight} />
    </View>
  );
}

function Pill({ text, style }: { text: string; style: object }) {
  return (
    <View style={[{ position: 'absolute', top: space.sm, backgroundColor: 'rgba(10,31,68,0.72)', borderRadius: radius.pill, paddingVertical: space.xxs, paddingHorizontal: space.sm }, style]}>
      <Text style={{ fontFamily: fontFamily.bold, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, color: c.white, textTransform: 'uppercase' }}>{text}</Text>
    </View>
  );
}

/** Shown on a completed order with no photos yet. */
export function PhotosPending() {
  return (
    <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.md, flexDirection: 'row', gap: space.sm, alignItems: 'center' }, elevation.bordered]}>
      <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: c.ice, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="star" size={18} color={c.accent} />
      </View>
      <Text style={[type.body, { flex: 1, color: c.inkMuted }]}>Before and after photos show up here when the shop adds them.</Text>
    </View>
  );
}
