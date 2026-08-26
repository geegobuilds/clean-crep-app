// Design tokens — ported 1:1 from project/app-screens.jsx (`C`) and
// project/colors_and_type.css. These are the source of truth for every
// surface (mobile app, landing page, operator dashboard).

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

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  button: 8,
  card: 12,
  pill: 20,
  avatar: 9999,
} as const;

export const fontFamily = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
} as const;

// Web CSS uses the font-family string directly instead of Expo's loaded
// font names.
export const webFontFamily = "'DM Sans', 'Inter', sans-serif";
