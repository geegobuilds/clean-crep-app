// Feature flags (migration 0020). Every new capability ships dark: it shows
// only when my_features() returns its key, which is true for staff, for
// allow-listed test accounts, and for everyone once enabled_for_all is on.
// The roadmap behind these lives in docs/VISION.md.
export const FEATURES = ['vault', 'passport', 'condition_grade', 'membership', 'smart_nudges', 'fresh_pairs'] as const;
export type Feature = (typeof FEATURES)[number];

export interface FeatureFlag {
  key: Feature;
  description: string;
  enabled_for_all: boolean;
  updated_at: string;
}
