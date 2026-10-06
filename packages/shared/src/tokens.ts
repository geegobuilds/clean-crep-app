// Design tokens — the source of truth for every surface (mobile app, landing
// page, operator dashboard). Rules for using them are in DESIGN.md at the repo
// root: navy + white/off-white + ONE accent (blue). The legacy keys below
// (charcoal, whatsapp, …) stay so older screens keep compiling; new and
// touched screens use `palette` and the mobile `theme`.

export const colors = {
  navy: '#0A1F44',
  blue: '#1A6FD4',
  blueHover: '#155CB8',
  navyHover: '#061329',
  charcoal: '#2A2D35',
  offWhite: '#F5F7FA',
  ice: '#E8F1FB',
  softBlue: '#A8C8F0',
  caption: '#5A6A8A',
  border: '#E0E8F4',
  white: '#FFFFFF',
  whatsapp: '#25D366',
} as const;

/** The cut-down palette from DESIGN.md §1. Tints are the same hues, not new colours. */
export const palette = {
  navy: '#0A1F44',
  white: '#FFFFFF',
  offWhite: '#F5F7FA',
  blue: '#1A6FD4',
  // tints
  inkMuted: '#5A6A8A',
  line: '#E0E8F4',
  ice: '#E8F1FB',
  onNavyMuted: '#A8C8F0',
  onNavyLine: 'rgba(255,255,255,0.14)',
  // error text only
  danger: '#B3261E',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
  // legacy names
  button: 8,
  card: 12,
  avatar: 9999,
} as const;

export const shadow = {
  card: '0 2px 10px rgba(10,31,68,0.06)',
  raised: '0 12px 28px rgba(10,31,68,0.18)',
} as const;

export const fontFamily = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
  display: 'Archivo_800ExtraBold',
  displayBold: 'Archivo_700Bold',
} as const;

// Web CSS uses the font-family string directly instead of Expo's loaded
// font names.
export const webFontFamily = "'DM Sans', 'Inter', sans-serif";
export const webDisplayFontFamily = "'Archivo', 'DM Sans', sans-serif";
