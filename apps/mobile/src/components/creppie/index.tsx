import type { ReactNode } from 'react';
import { Image, Text, View } from 'react-native';
import { colors, radius } from '@clean-crep/shared';
import { Icon } from '@/components/icon';
import { MOODS, type CreppieMood } from './moods';

export { MOODS, type CreppieMood } from './moods';

const MOOD_TINT: Record<CreppieMood, { bg: string; fg: string }> = {
  loading: { bg: colors.ice, fg: colors.blue },
  empty: { bg: colors.ice, fg: colors.blue },
  error: { bg: '#FEF3F0', fg: '#993C1D' },
  offline: { bg: '#FEF9E7', fg: '#B45309' },
  success: { bg: '#DCFCE7', fg: '#16A34A' },
  signin: { bg: colors.ice, fg: colors.blue },
};

/** The mascot for a mood: real art when it exists, placeholder icon until then. */
export function CreppieArt({ mood, size = 72 }: { mood: CreppieMood; size?: number }) {
  const { art, icon } = MOODS[mood];
  if (art) {
    return <Image testID={`creppie-${mood}`} source={art} style={{ width: size, height: size }} resizeMode="contain" />;
  }
  const tint = MOOD_TINT[mood];
  return (
    <View
      testID={`creppie-${mood}`}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint.bg, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={icon} size={Math.round(size * 0.4)} color={tint.fg} strokeWidth={mood === 'success' ? 2 : undefined} />
    </View>
  );
}

/** Card with the mascot, a title, body copy and optional actions. */
export function CreppieState({
  mood,
  title,
  body,
  children,
}: {
  mood: CreppieMood;
  title?: string;
  body?: string;
  children?: ReactNode;
}) {
  const copy = MOODS[mood];
  const bodyText = body ?? copy.body;
  return (
    <View style={{ backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: 24, alignItems: 'center' }}>
      <View style={{ marginBottom: 8 }}>
        <CreppieArt mood={mood} size={104} />
      </View>
      <Text style={{ fontSize: 15, fontFamily: 'DMSans_500Medium', color: colors.navy, textAlign: 'center', marginBottom: bodyText ? 4 : 0 }}>
        {title ?? copy.title}
      </Text>
      {!!bodyText && (
        <Text style={{ fontSize: 12, color: colors.caption, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 18 }}>{bodyText}</Text>
      )}
      {children && <View style={{ marginTop: 16, alignSelf: 'stretch' }}>{children}</View>}
    </View>
  );
}
