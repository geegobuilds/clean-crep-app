import type { ReactNode } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { c, elevation, radius, space, spring, type } from '@/theme';

/**
 * Screen title block: one huge title on the page background (no white band), a
 * line of muted copy, and an optional back button / action above it.
 */
export function ScreenHeader({ title, subtitle, left, right }: { title: string; subtitle?: string; left?: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ backgroundColor: c.bg, paddingHorizontal: space.lg, paddingTop: left || right ? space.xs : space.lg, paddingBottom: space.md }}>
      {!!(left || right) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginBottom: space.sm }}>
          {left ? (
            <View style={[{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }, elevation.card]}>{left}</View>
          ) : (
            <View />
          )}
          {right}
        </View>
      )}
      <Text style={type.hero} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} accessibilityRole="header">
        {title}
      </Text>
      {!!subtitle && <Text style={[type.body, { color: c.inkMuted, marginTop: space.xs }]}>{subtitle}</Text>}
    </View>
  );
}

/** Small uppercase section label ("ALL ORDERS"). */
export function Overline({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <Text style={type.overline}>{children}</Text>
    </View>
  );
}

type Variant = 'primary' | 'dark' | 'secondary' | 'onDark';

const VARIANTS: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: c.accent, fg: c.white },
  dark: { bg: c.navy, fg: c.white },
  secondary: { bg: c.surface, fg: c.navy, border: c.line },
  onDark: { bg: 'rgba(255,255,255,0.12)', fg: c.white },
};

/** Buttons spring down a touch when pressed. One primary per screen (DESIGN.md §7). */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  compact,
  style,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: ReactNode;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const v = VARIANTS[variant];
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[anim, style]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => (scale.value = withSpring(0.97, spring))}
        onPressOut={() => (scale.value = withSpring(1, spring))}
        style={{
          backgroundColor: v.bg,
          borderRadius: radius.md,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
          minHeight: compact ? 44 : 52,
          paddingHorizontal: compact ? space.md : space.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.xs,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {icon}
        <Text style={[type.button, { color: v.fg }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

/** White card: shadow by default, or a hairline border with `bordered`. */
export function Card({ children, style, bordered, testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; bordered?: boolean; testID?: string }) {
  return (
    <View testID={testID} style={[{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.md }, bordered ? elevation.bordered : elevation.card, style]}>
      {children}
    </View>
  );
}

/**
 * Anything tappable that should feel physical: springs down to 96% on press
 * (DESIGN.md §6). Use for cards, quick actions and custom buttons.
 */
export function PressScale({
  children,
  onPress,
  style,
  testID,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.96, spring))}
      onPressOut={() => (scale.value = withSpring(1, spring))}
    >
      <Animated.View style={[anim, style]}>{children}</Animated.View>
    </Pressable>
  );
}
