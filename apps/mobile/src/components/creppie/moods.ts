import type { ImageSourcePropType } from 'react-native';
import type { IconName } from '@/components/icon';

// ─────────────────────────────────────────────────────────────────────────────
// THE ONE FILE TO EDIT WHEN CREPPIE'S ARTWORK ARRIVES.
//
// Every loading / empty / error / offline / success / sign-in state in the app
// renders through <CreppieState>/<CreppieArt>, which look up the mood here.
// Art lives in assets/creppie/ (cut from the 2026-09 mascot renders). To change a pose:
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
    art: require('../../../assets/creppie/loading.png'), // scrubbing a shoe
    icon: 'clock',
    title: "Creppie's on it…",
    body: 'Getting everything fresh for you.',
  },
  empty: {
    art: require('../../../assets/creppie/empty.png'), // shrug
    icon: 'pkg',
    title: 'No kicks in the queue yet.',
    body: "Let's fix that.",
  },
  error: {
    art: require('../../../assets/creppie/error.png'), // slipping on a wet sole
    icon: 'help',
    title: 'Creppie slipped on a wet sole.',
    body: 'Something went wrong on our end. Try again?',
  },
  offline: {
    art: require('../../../assets/creppie/offline.png'), // no-wifi bubble
    icon: 'help',
    title: "Can't reach the shop.",
    body: 'Check your connection and try again.',
  },
  success: {
    art: require('../../../assets/creppie/success.png'), // thumbs up with a clean shoe
    icon: 'check',
    title: "Locked in. Creppie's got your pair.",
    body: '',
  },
  signin: {
    // No dedicated pose yet (a wave at the shop door would fit) — reuses the thumbs up.
    art: require('../../../assets/creppie/success.png'),
    icon: 'profile',
    title: 'Sign in to see this',
    body: '',
  },
};
