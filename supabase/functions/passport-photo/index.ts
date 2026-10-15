// Crep Passport photos (migration 0029). The order-photos bucket is private; this
// is the only public way to a photo, and only to the one a Passport showcases:
//   GET /functions/v1/passport-photo?code=K7Q4M2XR&kind=after   (or kind=before)
// It asks passport() (flag on for everyone + item public + latest finished clean,
// else null) and redirects to a signed URL that lives an hour. No listing, no
// guessing paths, nothing while the flag is off. Deployed with verify_jwt off
// (WhatsApp's link preview and website visitors have no token).
//
// After-photos go out with the Clean Crep badge stamped in the corner (every
// forward and link preview advertises the shop). The stamped copy is made once
// and kept privately at passport-wm/v1/<original path>; the original is never
// touched. If stamping fails (e.g. a HEIC upload), the original is served.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const CODE = /^[2-9A-Za-z]{8}$/;

const BUCKET = 'order-photos';
const WM_PREFIX = 'passport-wm/v1/';
// The badge (logo + cleancrep.com on a navy pill) lives on the website:
// apps/web/public/assets/watermark-badge.png. Fetched once per instance.
const BADGE_URL = 'https://www.cleancrep.com/assets/watermark-badge.png';
let badge: Promise<Uint8Array> | null = null;
function loadBadge(): Promise<Uint8Array> {
  badge ??= fetch(BADGE_URL).then(async (r) => {
    if (!r.ok) throw new Error(`badge ${r.status}`);
    return new Uint8Array(await r.arrayBuffer());
  });
  badge.catch(() => (badge = null)); // try again next time
  return badge;
}

function redirect(to: string) {
  // Cached well inside the hour the signed URL lives.
  return new Response(null, { status: 302, headers: { Location: to, 'Cache-Control': 'public, max-age=600' } });
}

/** A signed URL for the stamped copy of an after-photo, making it the first time. Null on any failure. */
async function stamped(db: SupabaseClient, path: string): Promise<string | null> {
  // Only formats the stamper reads; HEIC/WebP uploads go out as they are (no
  // pointless download + retry on every request).
  if (!/\.(jpe?g|png)$/i.test(path)) return null;
  const copy = WM_PREFIX + path.replace(/\.[a-z0-9]+$/i, '') + '.jpg';
  const existing = await db.storage.from(BUCKET).createSignedUrl(copy, 60 * 60);
  if (existing.data?.signedUrl) return existing.data.signedUrl;
  try {
    const { data: file } = await db.storage.from(BUCKET).download(path);
    if (!file) return null;
    const { watermark } = await import('./watermark.ts');
    const jpeg = await watermark(new Uint8Array(await file.arrayBuffer()), await loadBadge());
    const { error } = await db.storage.from(BUCKET).upload(copy, jpeg, { contentType: 'image/jpeg', upsert: true });
    if (error) return null;
    const made = await db.storage.from(BUCKET).createSignedUrl(copy, 60 * 60);
    return made.data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

function notFound() {
  return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'public, max-age=60' } });
}

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
  const url = new URL(req.url);
  const code = (url.searchParams.get('code') ?? '').trim();
  const kind = url.searchParams.get('kind');
  if (!CODE.test(code) || (kind !== 'before' && kind !== 'after')) return notFound();

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.rpc('passport', { p_code: code });
  const path: unknown = !error && data ? (data as { showcase?: Record<string, unknown> | null }).showcase?.[kind] : null;
  if (typeof path !== 'string' || !path) return notFound();

  if (kind === 'after') {
    const url = await stamped(db, path);
    if (url) return redirect(url);
  }
  const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (!signed?.signedUrl) return notFound();
  return redirect(signed.signedUrl);
});
