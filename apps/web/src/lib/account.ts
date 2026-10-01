// Where Supabase's sign-in emails send people back to. Pinned to the live
// domain (it's the one on Supabase's redirect allowlist, so a visitor who came
// in through the vercel.app alias still lands on /account/confirm, not the
// Site URL root); localhost keeps its own origin for local testing.
const LIVE_CONFIRM_URL = 'https://www.cleancrep.com/account/confirm';

export function accountConfirmUrl(): string {
  const { hostname, origin } = window.location;
  return hostname === 'localhost' || hostname === '127.0.0.1' ? `${origin}/account/confirm` : LIVE_CONFIRM_URL;
}

/**
 * Customer-facing copy for Supabase Auth errors on the account page. Raw
 * messages ("Error sending confirmation email", "For security purposes, you
 * can only request this after 37 seconds") look broken to a customer; the raw
 * error goes to the console instead.
 */
export function friendlyAuthError(error: { message?: string } | null, action: 'sendLink' | 'savePassword'): string {
  console.warn(`[account:${action}]`, error);
  const raw = (error?.message ?? '').toLowerCase();
  if (raw.includes('rate limit') || raw.includes('for security purposes') || raw.includes('too many')) {
    return 'Too many tries. Wait a minute, then try again.';
  }
  if (action === 'savePassword') {
    if (raw.includes('different from the old')) return "That's already your password. You're all set.";
    if (raw.includes('weak') || raw.includes('pwned') || raw.includes('known to be')) return 'Pick a stronger password, one you don’t use anywhere else.';
    if (raw.includes('at least')) return 'Use at least 8 characters.';
    return 'Couldn’t save your password just now. Try again in a minute.';
  }
  if (raw.includes('invalid') && raw.includes('email')) return 'That email doesn’t look right. Check it and try again.';
  return 'We couldn’t send your link just now. Try again in a minute.';
}
