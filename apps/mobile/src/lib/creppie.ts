import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

// Ask Creppie in the app talks to the website's relay (apps/web /api/creppie),
// which forwards to the same n8n Creppie that answers Instagram and the site.
// channel "app" makes the relay check our Supabase token: signed in, Creppie
// books onto this account (Orders tab, push updates, points); guest, he answers
// questions but asks them to sign in before booking (needsSignIn).

const CREPPIE_URL = process.env.EXPO_PUBLIC_CREPPIE_URL ?? 'https://www.cleancrep.com/api/creppie';
export const WHATSAPP_URL = 'https://wa.me/18765072163';
const STORE_KEY = 'creppie-chat-v1';

export interface CreppieMsg {
  role: 'user' | 'creppie';
  text: string;
}

export interface CreppieChatState {
  sessionId: string;
  msgs: CreppieMsg[];
}

/** RFC 4122 v4 from Math.random: fine for a chat id, and works on every runtime. */
function newSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** The saved conversation (same session id = Creppie remembers the chat), or a fresh one. */
export async function loadChat(): Promise<CreppieChatState> {
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(STORE_KEY)) ?? 'null');
    if (saved && typeof saved.sessionId === 'string' && Array.isArray(saved.msgs)) return saved;
  } catch {
    // unreadable storage: start fresh
  }
  return { sessionId: newSessionId(), msgs: [] };
}

export function saveChat(state: CreppieChatState) {
  AsyncStorage.setItem(STORE_KEY, JSON.stringify({ sessionId: state.sessionId, msgs: state.msgs.slice(-60) })).catch(() => {});
}

export async function askCreppie(sessionId: string, message: string): Promise<{ reply: string; needsSignIn: boolean }> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch(CREPPIE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ sessionId, message, channel: 'app' }),
    });
    const body = (await res.json()) as { reply?: unknown; needsSignIn?: unknown };
    const reply = typeof body.reply === 'string' && body.reply ? body.reply : `Something went wrong on my side. Link us on WhatsApp: ${WHATSAPP_URL}`;
    return { reply, needsSignIn: body.needsSignIn === true };
  } catch {
    return {
      reply: `Looks like you're offline. Check your connection and try again, or link us on WhatsApp: ${WHATSAPP_URL}`,
      needsSignIn: false,
    };
  }
}
