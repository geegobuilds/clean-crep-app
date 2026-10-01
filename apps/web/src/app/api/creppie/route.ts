import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Relays the website's Creppie chat to the same n8n workflow WhatsApp/IG use
// (clean-crep-systems/creppie.json). That webhook takes { user_id, message }
// and answers { reply }, keeping chat history per user_id and logging any
// booking to Airtable + the app's orders table — so a web booking lands in the
// staff dashboard exactly like a WhatsApp one.
//
// Why a relay instead of calling n8n from the browser: the webhook URL stays
// private, user_id is ours to shape (n8n drops it into an Airtable formula, so
// it must never be free text), and each message costs Claude API credit and
// Airtable API calls, so it's rate-limited here.
//
// Two channels share this relay:
//   website: user_id "web-<session>"
//   app ("channel": "app"): user_id "app-<session>", so the conversation stays the
//     same before and after the customer signs in. If the request carries a
//     valid Supabase access token, subscriber_id is "cust-<user id>": Creppie
//     then takes the booking onto that account. Without one (a guest),
//     subscriber_id = user_id and Creppie asks them to sign in before booking
//     (it answers with needsSignIn). The customer id only ever comes from a
//     verified token, never from the request body.

const WHATSAPP_URL = 'https://wa.me/18765072163';
const FALLBACK = `Creppie can't answer right now. Link us on WhatsApp and the team will sort you out: ${WHATSAPP_URL}`;

const MAX_MESSAGE = 500;
const SESSION_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Best-effort limits. Serverless instances each keep their own counters, so
// this caps bursts and casual abuse rather than being exact.
const LIMITS = [
  { key: (s: string) => `s:${s}`, max: 30, windowMs: 60 * 60 * 1000 }, // per chat, per hour
  { key: (_s: string, ip: string) => `ip:${ip}`, max: 60, windowMs: 60 * 60 * 1000 }, // per visitor IP, per hour
];
const hits = new Map<string, number[]>();

function limited(session: string, ip: string): boolean {
  const now = Date.now();
  let over = false;
  for (const l of LIMITS) {
    const k = l.key(session, ip);
    const recent = (hits.get(k) ?? []).filter((t) => now - t < l.windowMs);
    if (recent.length >= l.max) over = true;
    hits.set(k, recent);
  }
  if (!over) for (const l of LIMITS) hits.get(l.key(session, ip))!.push(now);
  if (hits.size > 5000) hits.clear(); // keep memory bounded
  return over;
}

export async function POST(req: Request) {
  const webhook = process.env.CREPPIE_WEBHOOK_URL;
  if (!webhook) return NextResponse.json({ reply: FALLBACK }, { status: 503 });

  let body: { sessionId?: unknown; message?: unknown; channel?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.toLowerCase() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!SESSION_RE.test(sessionId) || !message) return NextResponse.json({ error: 'bad request' }, { status: 400 });
  if (message.length > MAX_MESSAGE) {
    return NextResponse.json({ reply: `Keep it under ${MAX_MESSAGE} characters and I got you.` }, { status: 400 });
  }

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  if (limited(sessionId, ip)) {
    return NextResponse.json(
      { reply: `Yuh chatting fast! Give me a little break, or link the team on WhatsApp: ${WHATSAPP_URL}` },
      { status: 429 }
    );
  }

  const isApp = body.channel === 'app';
  const userId = `${isApp ? 'app' : 'web'}-${sessionId}`;
  let subscriberId = userId;
  if (isApp) {
    const customerId = await verifiedUserId(req.headers.get('authorization'));
    if (customerId) subscriberId = `cust-${customerId}`;
  }

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, subscriber_id: subscriberId, message }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) throw new Error(`n8n ${res.status}`);
    const data = (await res.json()) as { reply?: unknown; needsSignIn?: unknown };
    const reply = typeof data.reply === 'string' && data.reply.trim() ? data.reply.trim() : null;
    if (!reply) throw new Error('empty reply');
    return NextResponse.json({ reply, needsSignIn: data.needsSignIn === true });
  } catch (e) {
    console.error('creppie relay failed', e);
    return NextResponse.json({ reply: FALLBACK }, { status: 502 });
  }
}

/** The signed-in app customer's id from a "Bearer <supabase access token>" header, or null. */
async function verifiedUserId(authorization: string | null): Promise<string | null> {
  const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !key) return null;
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.auth.getUser(token);
    return error || !data.user ? null : data.user.id;
  } catch {
    return null;
  }
}
