// Where Supabase's sign-in emails send people back to. Pinned to the live
// domain (it's the one on Supabase's redirect allowlist, so a visitor who came
// in through the vercel.app alias still lands on /account/confirm, not the
// Site URL root); localhost keeps its own origin for local testing.
const LIVE_CONFIRM_URL = 'https://www.cleancrep.com/account/confirm';

export function accountConfirmUrl(): string {
  const { hostname, origin } = window.location;
  return hostname === 'localhost' || hostname === '127.0.0.1' ? `${origin}/account/confirm` : LIVE_CONFIRM_URL;
}
