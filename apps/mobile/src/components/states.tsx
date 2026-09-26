import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View, type DimensionValue, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '@clean-crep/shared';
import { CreppieArt, CreppieState, MOODS } from '@/components/creppie';

// Shared loading / empty / error / signed-out states so every data screen
// tells those cases apart instead of rendering a blank or misleading list.

/** Pulsing placeholder block. Built on core Animated — no extra dependency. */
export function Skeleton({ width = '100%', height = 14, style }: { width?: DimensionValue; height?: number; style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[{ width, height, borderRadius: 6, backgroundColor: colors.ice, opacity }, style]} />;
}

/** Placeholder shaped like an order / notification card. */
export function SkeletonCard() {
  return (
    <View style={{ backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ gap: 6, flex: 1 }}>
          <Skeleton width="55%" height={13} />
          <Skeleton width="35%" height={10} />
        </View>
        <Skeleton width={64} height={18} />
      </View>
      <Skeleton height={4} />
    </View>
  );
}

/** Placeholder shaped like a Book-screen service card. */
export function SkeletonServiceCard() {
  return (
    <View style={{ backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: 16, flexDirection: 'row', gap: 12 }}>
      <Skeleton width={40} height={40} style={{ borderRadius: 10 }} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="45%" height={15} />
        <Skeleton width="90%" height={10} />
        <Skeleton width="30%" height={20} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 3, variant = 'card' }: { count?: number; variant?: 'card' | 'service' }) {
  const Item = variant === 'service' ? SkeletonServiceCard : SkeletonCard;
  return (
    <View style={{ gap: 10 }}>
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
          <CreppieArt mood="loading" size={64} />
          <Text style={{ fontSize: 13, fontFamily: 'DMSans_500Medium', color: colors.caption }}>{MOODS.loading.title}</Text>
        </View>
        <SkeletonList count={2} />
      </View>
    </SafeAreaView>
  );
}

export function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: colors.blue, borderRadius: radius.button, paddingVertical: 12, alignItems: 'center' }}>
      <Text style={{ color: colors.white, fontSize: 13, fontFamily: 'DMSans_500Medium' }}>{label}</Text>
    </Pressable>
  );
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

export function SignInPrompt({ title, body, onSignIn }: { title: string; body: string; onSignIn: () => void }) {
  return (
    <CreppieState mood="signin" title={title} body={body}>
      <PrimaryButton label="Sign In" onPress={onSignIn} />
    </CreppieState>
  );
}
