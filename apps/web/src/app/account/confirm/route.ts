import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

// Lands the "create your account" link from a Quick Book email. Handles both
// link styles Supabase can send:
//   ?code=…                        (default template, PKCE: same browser that booked)
//   ?token_hash=…&type=email       (custom template: works in any browser / email app)
// then sends them to /account, signed in.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = (url.searchParams.get('type') ?? 'email') as EmailOtpType;
  const supabase = await createClient();

  let ok = false;
  if (tokenHash) ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  else if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;

  return NextResponse.redirect(new URL(ok ? '/account' : '/account?error=link_expired', url.origin));
}
