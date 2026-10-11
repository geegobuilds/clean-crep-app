// Tour photos: free-licence Unsplash shots, loaded on the phone from Unsplash's
// image CDN. A "before" is the same shot, dulled and yellowed by the CDN.
const SHOTS: Record<string, string> = {
  af1: '1600269452121-4f2416e55c28',
  j1: '1552346154-21d32810aba3',
  cap: '1521369909029-2afed882baee',
};
const AGED = '&sat=-40&sepia=45&bri=-12&con=-15&blur=5';

/** The tour backend signs photos as ".../tour:<shot>-<before|after>"; anything else passes through. */
export function photoUrl(url: string): string;
export function photoUrl(url: string | null | undefined): string | null | undefined;
export function photoUrl(url: string | null | undefined) {
  const m = url ? /\/tour:([a-z0-9]+)-(before|after)/.exec(url) : null;
  if (!m || !SHOTS[m[1]]) return url;
  return `https://images.unsplash.com/photo-${SHOTS[m[1]]}?w=900&h=900&fit=crop&q=80&auto=format${m[2] === 'before' ? AGED : ''}`;
}
