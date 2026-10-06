// Before/after photos for the homepage ("The Difference" slider, the hero
// image and the Open Graph image). Files live in public/assets/work/ as
// before-N.jpg / after-N.jpg. The ones there now are grey placeholders.
//
// To swap in real photos: overwrite the files with the same names (any size,
// landscape 3:2 or 4:3 works best; the same framing for each before/after so
// the slider lines up). To add a pair, drop in before-4.jpg / after-4.jpg and
// add { n: 4 } below. Pair 1 is the hero and social-share image, so make it
// the best one.

/**
 * Flip to true once the real before/after photos replace the placeholders.
 * While false, the hero image, "The Difference" section and the social-share
 * image are hidden, so the live site never shows grey placeholder boxes.
 */
export const PHOTOS_READY = false;

export interface WorkPair {
  n: number;
  /** Optional caption under the slider, e.g. "White AF1s · Sneaker Clean + Sole Refresh". */
  caption?: string;
}

export const WORK_PAIRS: WorkPair[] = [{ n: 1 }, { n: 2 }, { n: 3 }];

export const beforeSrc = (n: number) => `/assets/work/before-${n}.jpg`;
export const afterSrc = (n: number) => `/assets/work/after-${n}.jpg`;

/** Social share image: the best after-photo (pair 1). */
export const OG_IMAGE = { url: afterSrc(1), width: 1600, height: 1200, alt: 'A pair after a Clean Crep clean' };
