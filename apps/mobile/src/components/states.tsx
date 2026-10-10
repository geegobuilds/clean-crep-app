import { useEffect, useState } from 'react';
import { Animated, Easing, Text, View, type DimensionValue, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, palette, shadow } from '@clean-crep/shared';
import { Button } from './ui';
import { CreppieArt, CreppieState, MOODS } from '@/components/creppie';
import { track } from '@/lib/analytics';

// Shared loading / empty / error / signed-out states so every data screen
// tells those cases apart instead of rendering a blank or misleading list.

/**
 * Placeholder block with a soft light sweep across it (the shimmer premium apps
 * use instead of a blink). Built on core Animated — no extra dependency.
 */
export function Skeleton({ width = '100%', height = 14, style }: { width?: DimensionValue; height?: number; style?: ViewStyle }) {
  const [sweep] = useState(() => new Animated.Value(0));
  const [w, setW] = useState(0);

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [sweep]);

  const band = Math.max(60, w * 0.6);
  const translateX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-band, w + band] });
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[{ width, height, borderRadius: 8, backgroundColor: palette.ice, overflow: 'hidden' }, style]}>
      {w > 0 && (
        <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, width: band, transform: [{ translateX }], flexDirection: 'row' }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.25)' }} />
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.6)' }} />
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.25)' }} />
        </Animated.View>
      )}
    </View>
  );
}

const card: ViewStyle = { backgroundColor: palette.white, borderRadius: 20, boxShadow: shadow.card };

/** Placeholder shaped like an order / notification card. */
export function SkeletonCard() {
  return (
    <View style={[card, { padding: 16, gap: 12 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ gap: 8, flex: 1 }}>
          <Skeleton width="55%" height={14} />
          <Skeleton width="35%" height={10} />
        </View>
        <Skeleton width={64} height={20} style={{ borderRadius: 10 }} />
      </View>
      <Skeleton height={6} />
    </View>
  );
}

/** Placeholder shaped like a Book-screen menu card. */
export function SkeletonServiceCard() {
  return (
    <View style={[card, { padding: 20, gap: 10 }]}>
      <Skeleton width={24} height={10} />
      <Skeleton width="60%" height={24} />
      <Skeleton width="90%" height={12} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <Skeleton width="35%" height={28} />
        <Skeleton width={44} height={44} style={{ borderRadius: 22 }} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 3, variant = 'card' }: { count?: number; variant?: 'card' | 'service' }) {
  const Item = variant === 'service' ? SkeletonServiceCard : SkeletonCard;
  return (
    <View style={{ gap: 14 }}>
      {Array.from({ length: count }, (_, i) => (
        <Item key={i} />
      ))}
    </View>
  );
}

/** Whole-screen placeholder while the session is being restored on launch. */
export function ScreenSkeleton() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.offWhite }} edges={['top']}>
      <View style={{ backgroundColor: colors.white, padding: 20, paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width={36} height={36} style={{ borderRadius: 18 }} />
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Skeleton width={80} height={10} />
          <Skeleton width={110} height={15} />
        </View>
      </View>
      <View style={{ padding: 20, gap: 16 }}>
        <View style={{ alignItems: 'center', paddingVertical: 12, gap: 10 }}>
          <CreppieArt mood="loading" size={112} />
          <Text style={{ fontSize: 13, fontFamily: 'DMSans_500Medium', color: colors.caption }}>{MOODS.loading.title}</Text>
        </View>
        <SkeletonList count={2} />
      </View>
    </SafeAreaView>
  );
}

export function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Button label={label} onPress={onPress} />;
}

export function EmptyState({ title, body, actionLabel, onAction }: { title?: string; body?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <CreppieState mood="empty" title={title} body={body}>
      {actionLabel && onAction && <PrimaryButton label={actionLabel} onPress={onAction} />}
    </CreppieState>
  );
}

/** `message` comes from friendlyError(); offline gets its own Creppie mood. */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const offline = message.startsWith("You're offline");
  return (
    <CreppieState mood={offline ? 'offline' : 'error'} body={message}>
      <PrimaryButton label="Try Again" onPress={onRetry} />
    </CreppieState>
  );
}

export function SignInPrompt({ title, body, onSignIn, where }: { title: string; body: string; onSignIn: () => void; where: string }) {
  useEffect(() => {
    track('signin_prompted', { where });
  }, [where]);
  return (
    <CreppieState mood="signin" title={title} body={body}>
      <PrimaryButton label="Sign In" onPress={onSignIn} />
    </CreppieState>
  );
}
