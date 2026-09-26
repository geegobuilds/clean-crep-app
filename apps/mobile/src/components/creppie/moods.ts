import type { ImageSourcePropType } from 'react-native';
import type { IconName } from '@/components/icon';

// ─────────────────────────────────────────────────────────────────────────────
// THE ONE FILE TO EDIT WHEN CREPPIE'S ARTWORK ARRIVES.
//
// Every loading / empty / error / offline / success / sign-in state in the app
// renders through <CreppieState>/<CreppieArt>, which look up the mood here.
// Right now each mood uses a placeholder icon. To swap in real art:
//   1. Drop the PNGs into apps/mobile/assets/creppie/ (see the README there).
//   2. Set `art: require('../../../assets/creppie/<mood>.png')` for that mood.
// No screen code changes. (For animated Lottie poses later: add
// lottie-react-native and a `lottie` field here — CreppieArt is the only
// component that would need a new branch.)
// ─────────────────────────────────────────────────────────────────────────────

export type CreppieMood = 'loading' | 'empty' | 'error' | 'offline' | 'success' | 'signin';

export interface MoodConfig {
  /** Final mascot art. null = show the placeholder icon. */
  art: ImageSourcePropType | null;
  /** Placeholder until the art exists. */
  icon: IconName;
  /** Default copy in Creppie's voice; screens can override. */
  title: string;
  body: string;
}

export const MOODS: Record<CreppieMood, MoodConfig> = {
  loading: {
    art: null, // pose: scrubbing a shoe
    icon: 'clock',
    title: "Creppie's on it…",
    body: 'Getting everything fresh for you.',
  },
  empty: {
    art: null, // pose: shrug next to an empty shoe rack
    icon: 'pkg',
    title: 'No kicks in the queue yet.',
    body: "Let's fix that.",
  },
  error: {
    art: null, // pose: slipped on a wet sole / sweating
    icon: 'help',
    title: 'Creppie slipped on a wet sole.',
    body: 'Something went wrong on our end. Try again?',
  },
  offline: {
    art: null, // pose: holding a phone with no signal
    icon: 'help',
    title: "Can't reach the shop.",
    body: 'Check your connection and try again.',
  },
  success: {
    art: null, // pose: thumbs up holding a clean shoe
    icon: 'check',
    title: "Locked in. Creppie's got your pair.",
    body: '',
  },
  signin: {
    art: null, // pose: waving at the door
    icon: 'profile',
    title: 'Sign in to see this',
    body: '',
  },
};
