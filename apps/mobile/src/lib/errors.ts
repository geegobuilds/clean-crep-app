// Customer-facing error copy. Raw Supabase/JS error strings ("new row violates
// row-level security policy", "TypeError: Network request failed") must never
// reach the screen — they look broken and leak backend details. Every catch
// that shows something to the user goes through friendlyError(); the raw
// error is logged with console.warn for debugging.

export type ErrorContext = 'booking' | 'signIn' | 'signUp' | 'load';

const FALLBACK: Record<ErrorContext, string> = {
  booking: "Couldn't place your booking. Check your connection and try again, or message us on WhatsApp.",
  signIn: "Couldn't sign you in. Check your connection and try again.",
  signUp: "Couldn't create your account. Check your connection and try again.",
  load: "Couldn't load this right now. Check your connection and try again.",
};

function rawMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const { message } = error as { message: unknown };
    if (typeof message === 'string') return message;
  }
  return String(error);
}

export function friendlyError(error: unknown, context: ErrorContext): string {
  console.warn(`[${context}]`, error);
  const raw = rawMessage(error).toLowerCase();

  if (raw.includes('network request failed') || raw.includes('failed to fetch')) {
    return context === 'booking'
      ? "You're offline. Check your connection and try again, or message us on WhatsApp."
      : "You're offline. Check your connection and try again.";
  }
  if (raw.includes('invalid login credentials')) {
    return "That email and password don't match. Try again, or sign up if you're new.";
  }
  if (raw.includes('email not confirmed')) {
    return 'Confirm your email first. Check your inbox for the link, then sign in.';
  }
  if (raw.includes('user already registered') || raw.includes('already been registered')) {
    return 'There\'s already an account with that email. Sign in instead.';
  }
  if (raw.includes('password should be') || raw.includes('password is too short')) {
    return 'Password needs to be at least 6 characters.';
  }
  if (raw.includes('invalid email') || raw.includes('unable to validate email')) {
    return "That email doesn't look right. Check it and try again.";
  }
  if (raw.includes('rate limit') || raw.includes('too many requests')) {
    return 'Too many tries. Wait a minute and try again.';
  }
  return FALLBACK[context];
}
