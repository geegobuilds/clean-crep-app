// Crep Passport photos (migration 0029). The order-photos bucket is private; this
// is the only public way to a photo, and only to the one a Passport showcases:
//   GET /functions/v1/passport-photo?code=K7Q4M2XR&kind=after   (or kind=before)
// It asks passport() (flag on for everyone + item public + latest finished clean,
// else null) and redirects to a signed URL that lives an hour. No listing, no
// guessing paths, nothing while the flag is off. Deployed with verify_jwt off
// (WhatsApp's link preview and website visitors have no token).
import { createClient } from 'npm:@supabase/supabase-js@2';

const CODE = /^[2-9A-Za-z]{8}$/;

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

  const { data: signed } = await db.storage.from('order-photos').createSignedUrl(path, 60 * 60);
  if (!signed?.signedUrl) return notFound();
  // Cached well inside the hour the signed URL lives.
  return new Response(null, { status: 302, headers: { Location: signed.signedUrl, 'Cache-Control': 'public, max-age=600' } });
});
