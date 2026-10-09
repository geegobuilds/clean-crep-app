// React Native styles built from the shared tokens. Rules: DESIGN.md.
// Screens pull colours, type, spacing, radius and shadow from here instead of
// typing hex codes, font names or one-off sizes inline.
import type { TextStyle, ViewStyle } from 'react-native';
import { fontFamily, palette, radius, shadow, spacing } from '@clean-crep/shared';

export const c = {
  ...palette,
  ink: palette.navy,
  bg: palette.offWhite,
  surface: palette.white,
  accent: palette.blue,
} as const;

export const space = spacing;
export { radius };

const t = (s: TextStyle): TextStyle => s;

/** Type scale (DESIGN.md §2). Body text is never below 15. */
export const type = {
  /** Screen titles: the one huge thing on a screen (DESIGN.md §8). */
  hero: t({ fontFamily: fontFamily.display, fontSize: 44, lineHeight: 46, letterSpacing: -1.4, color: c.ink }),
  display: t({ fontFamily: fontFamily.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.5, color: c.ink }),
  title: t({ fontFamily: fontFamily.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.3, color: c.ink }),
  headline: t({ fontFamily: fontFamily.displayBold, fontSize: 19, lineHeight: 24, color: c.ink }),
  price: t({ fontFamily: fontFamily.display, fontSize: 22, lineHeight: 26, color: c.accent, fontVariant: ['tabular-nums'] }),
  priceLg: t({ fontFamily: fontFamily.display, fontSize: 30, lineHeight: 34, color: c.ink, fontVariant: ['tabular-nums'] }),
  body: t({ fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22, color: c.ink }),
  bodyStrong: t({ fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 22, color: c.ink }),
  button: t({ fontFamily: fontFamily.bold, fontSize: 16, lineHeight: 20 }),
  caption: t({ fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18, color: c.inkMuted }),
  overline: t({ fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 16, letterSpacing: 1.6, color: c.inkMuted, textTransform: 'uppercase' }),
} as const;

const v = (s: ViewStyle): ViewStyle => s;

/** A surface has a shadow OR a border, never both (DESIGN.md §5). */
export const elevation = {
  card: v({ boxShadow: shadow.card }),
  raised: v({ boxShadow: shadow.raised }),
  bordered: v({ borderWidth: 1, borderColor: c.line }),
} as const;

/** Spring used for UI motion (DESIGN.md §6). */
export const spring = { damping: 16, stiffness: 180, mass: 1 } as const;
