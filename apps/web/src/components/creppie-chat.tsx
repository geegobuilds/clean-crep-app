'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { track } from '@/lib/analytics';

// Floating "Ask Creppie" chat on the landing page (bubble = his face, cropped from the waving pose). Talks to /api/creppie,
// which relays to the same Creppie that answers WhatsApp/IG.

const WHATSAPP_URL = 'https://wa.me/18765072163';
const STORE_KEY = 'creppie-chat-v1';
const GREETING = "Wah gwaan! I'm Creppie, Clean Crep's assistant. Ask me about prices, turnaround, pickup, or book a clean right here.";
const QUICK = ['How much for sneakers?', 'Book a clean', 'Do you do pickup?'];

// "Need help?" nudge: once per visit, at the moment people tend to have a
// question, and never again for a week once dismissed. Never shown to someone
// who has already chatted.
const NUDGES: Record<string, string> = {
  services: 'Not sure which clean? Ask me 👋',
  location: 'Need pickup? I got you',
  default: 'Need help booking? 👋',
};
const NUDGE_DELAY_MS = 8_000; // generic nudge if they haven't scrolled to a section by then
const NUDGE_MIN_MS = 3_000; // don't pounce before they've looked at the page
const NUDGE_DWELL_MS = 700; // time on a section before it counts
const NUDGE_SHOW_MS = 8_000;
const NUDGE_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const NUDGE_SEEN_KEY = 'creppie-nudge-seen'; // sessionStorage: once per visit
const NUDGE_DISMISSED_KEY = 'creppie-nudge-dismissed'; // localStorage: timestamp

function nudgeAllowed(): boolean {
  try {
    if (sessionStorage.getItem(NUDGE_SEEN_KEY)) return false;
    const dismissed = Number(localStorage.getItem(NUDGE_DISMISSED_KEY) ?? 0);
    return !dismissed || Date.now() - dismissed > NUDGE_SNOOZE_MS;
  } catch {
    return false; // can't remember a dismissal, so don't risk nagging
  }
}

interface Msg {
  role: 'user' | 'creppie';
  text: string;
}

function newSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // Older browsers: RFC 4122 v4 from Math.random is fine for a chat id.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function load(): { sessionId: string; msgs: Msg[] } {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');
    if (saved && typeof saved.sessionId === 'string' && Array.isArray(saved.msgs)) return saved;
  } catch {
    // private mode / blocked storage: start fresh
  }
  return { sessionId: newSessionId(), msgs: [] };
}

/** Creppie's replies can carry a WhatsApp link; make links tappable. */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p.replace(/[.,)]+$/, '')} target="_blank" rel="noopener noreferrer">
            {p.includes('wa.me') ? 'Open WhatsApp' : p}
          </a>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
  );
}

export function CreppieChat() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [restored, setRestored] = useState(false);
  const [nudge, setNudge] = useState<string | null>(null);
  const hasChatted = msgs.some((m) => m.role === 'user');
  const openRef = useRef(false); // read by the nudge timers
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Restore the visitor's chat (and its id, so Creppie remembers them).
  useEffect(() => {
    const saved = load();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot restore from localStorage after mount
    setSessionId(saved.sessionId);
    setMsgs(saved.msgs);
    setRestored(true);
  }, []);

  // Schedule the one nudge for this visit: whichever comes first of scrolling
  // to Services / Location (context-specific copy) or NUDGE_DELAY_MS.
  useEffect(() => {
    if (!restored || hasChatted || !nudgeAllowed()) return;
    let fired = false;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const fire = (key: string) => {
      // Already talking to him: the nudge is spent for this visit.
      if (fired || openRef.current) {
        fired = true;
        return;
      }
      fired = true;
      try {
        sessionStorage.setItem(NUDGE_SEEN_KEY, '1');
      } catch {
        // ignore
      }
      setNudge(NUDGES[key] ?? NUDGES.default);
      hideTimer = setTimeout(() => setNudge(null), NUDGE_SHOW_MS);
    };
    // Only a section the visitor settles on counts, not one smooth-scrolled
    // past on the way to another (e.g. the nav's Location link).
    const dwell = new Map<string, ReturnType<typeof setTimeout>>();
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          const id = e.target.id;
          clearTimeout(dwell.get(id));
          if (e.isIntersecting) dwell.set(id, setTimeout(() => fire(id), NUDGE_DWELL_MS));
        }),
      // A band across the middle of the screen: fires when the section is
      // actually being read, however tall it is.
      { rootMargin: '-40% 0px -40% 0px' }
    );
    const watchTimer = setTimeout(() => {
      for (const id of ['services', 'location']) {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      }
    }, NUDGE_MIN_MS);
    const fallbackTimer = setTimeout(() => fire('default'), NUDGE_DELAY_MS);
    return () => {
      clearTimeout(watchTimer);
      clearTimeout(fallbackTimer);
      clearTimeout(hideTimer);
      observer.disconnect();
      dwell.forEach(clearTimeout);
    };
  }, [restored, hasChatted]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  function openChat() {
    track('creppie_chat_opened', { platform: 'web' });
    openRef.current = true;
    setNudge(null);
    setOpen(true);
  }

  function dismissNudge() {
    setNudge(null);
    try {
      localStorage.setItem(NUDGE_DISMISSED_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!sessionId) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ sessionId, msgs: msgs.slice(-60) }));
    } catch {
      // storage blocked: chat still works for this visit
    }
  }, [sessionId, msgs]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, sending, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending || !sessionId) return;
    setDraft('');
    setMsgs((m) => [...m, { role: 'user', text: message }]);
    setSending(true);
    track('creppie_message_sent');
    let reply: string;
    try {
      const res = await fetch('/api/creppie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message }),
      });
      const data = (await res.json()) as { reply?: string };
      reply = data.reply ?? `Something went wrong on my side. Link us on WhatsApp: ${WHATSAPP_URL}`;
    } catch {
      reply = `Looks like you're offline. Check your connection and try again, or link us on WhatsApp: ${WHATSAPP_URL}`;
    }
    setMsgs((m) => [...m, { role: 'creppie', text: reply }]);
    setSending(false);
  }

  return (
    <>
      {open && (
        <div className="creppie-panel" role="dialog" aria-label="Chat with Creppie">
          <div className="creppie-head">
            <Image src="/assets/creppie-face.png" alt="" width={40} height={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="creppie-name">Creppie</div>
              <div className="creppie-sub">Clean Crep&apos;s assistant · replies in seconds</div>
            </div>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="creppie-wa" aria-label="WhatsApp the team">
              <WhatsAppIcon size={14} />
            </a>
            <button className="creppie-close" onClick={() => setOpen(false)} aria-label="Close chat">
              ×
            </button>
          </div>

          <div className="creppie-list" ref={listRef}>
            <div className="creppie-hello">
              <Image src="/assets/creppie-wave-upper.png" alt="Creppie waving" width={138} height={120} priority />
            </div>
            <div className="creppie-msg creppie">{GREETING}</div>
            {msgs.map((m, i) => (
              <div key={i} className={`creppie-msg ${m.role}`}>
                {m.role === 'creppie' ? <Linkified text={m.text} /> : m.text}
              </div>
            ))}
            {sending && (
              <div className="creppie-msg creppie creppie-typing" aria-label="Creppie is typing">
                <span />
                <span />
                <span />
              </div>
            )}
            {msgs.length === 0 && !sending && (
              <div className="creppie-quick">
                {QUICK.map((q) => (
                  <button key={q} onClick={() => send(q)}>
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            className="creppie-input"
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
          >
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(draft);
                }
              }}
              placeholder="Ask Creppie anything…"
              rows={1}
              maxLength={500}
              aria-label="Message"
            />
            <button type="submit" disabled={!draft.trim() || sending} aria-label="Send">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {nudge && !open && (
        <div className="creppie-nudge" role="status">
          <button className="creppie-nudge-text" onClick={openChat}>
            {nudge}
          </button>
          <button className="creppie-nudge-x" onClick={dismissNudge} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <button
        className={`creppie-fab${nudge && !open ? ' creppie-fab-bounce' : ''}`}
        onClick={() => (open ? setOpen(false) : openChat())} aria-label={open ? 'Close chat' : 'Chat with Creppie'} aria-expanded={open}>
        {open ? (
          <span className="creppie-fab-x">×</span>
        ) : (
          <>
            <Image src="/assets/creppie-face.png" alt="" width={52} height={52} />
            <span className="creppie-fab-label">Ask Creppie</span>
          </>
        )}
      </button>
    </>
  );
}
