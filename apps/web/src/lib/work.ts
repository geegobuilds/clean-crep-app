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
 * Placeholders show for now (Geego's call, 2026-10-06). Set to false to hide
 * the photo areas; while false, the hero image, "The Difference" section and the social-share
 * image are hidden, so the live site never shows grey placeholder boxes.
 */
export const PHOTOS_READY = true;

export interface WorkPair {
  n: number;
  /** Photo URLs (e.g. signed Storage URLs on a Passport) instead of the files in public/assets/work. */
  beforeUrl?: string | null;
  afterUrl?: string;
  /** What the photos show, for alt text ("Nike Air Force 1"); caps aren't pairs. */
  label?: string;
  /** Stock sample photos: always shown with a "Sample" tag. */
  sample?: boolean;
  /** Optional caption under the slider, e.g. "White AF1s · Sneaker Clean + Sole Refresh". */
  caption?: string;
}

/**
 * Sample photos (Geego, 2026-10-15): until real before/afters are in, the slots
 * show free-licence Unsplash product shots, each tagged "Sample" on the page.
 * The "before" is the same shot aged by Unsplash's image CDN. Set to false once
 * real photos are in public/assets/work/.
 */
export const SAMPLE_PHOTOS = true;
const SAMPLE_SHOTS: Record<number, string> = {
  1: '1600269452121-4f2416e55c28', // white Air Force 1
  2: '1552346154-21d32810aba3', // Jordan 1 "Bred"
  3: '1521369909029-2afed882baee', // washed dad cap
};
const sample = (n: number, aged: boolean) =>
  `https://images.unsplash.com/photo-${SAMPLE_SHOTS[n] ?? SAMPLE_SHOTS[1]}?w=1600&h=1200&fit=crop&q=80&auto=format${aged ? '&sat=-40&sepia=45&bri=-12&con=-15&blur=5' : ''}`;

export const WORK_PAIRS: WorkPair[] = SAMPLE_PHOTOS
  ? [
      { n: 1, label: 'Nike Air Force 1', caption: 'Sample photo · White AF1s · Sneaker Clean' },
      { n: 2, label: 'Jordan 1 Retro', caption: 'Sample photo · Jordan 1s · Sole Refresh' },
      { n: 3, label: 'Dad cap', caption: 'Sample photo · Washed cap · Standard Cap Clean' },
    ]
  : [{ n: 1 }, { n: 2 }, { n: 3 }];

export const beforeSrc = (n: number) => (SAMPLE_PHOTOS ? sample(n, true) : `/assets/work/before-${n}.jpg`);
export const afterSrc = (n: number) => (SAMPLE_PHOTOS ? sample(n, false) : `/assets/work/after-${n}.jpg`);

/** Social share image: the best after-photo (pair 1). */
export const OG_IMAGE = { url: afterSrc(1), width: 1600, height: 1200, alt: SAMPLE_PHOTOS ? 'Fresh white sneakers' : 'A pair after a Clean Crep clean' };

/**
 * A tagged sample before/after for a Passport whose item has no photos yet
 * (Geego, 2026-10-15). Sneakers and caps only; Clarks have no sample shot.
 */
export function sampleFor(category: string): { before: string; after: string } | null {
  const n = category === 'sneaker' ? 1 : category === 'cap' ? 3 : 0;
  return n ? { before: sample(n, true), after: sample(n, false) } : null;
}
