import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { colors, pairTitle, type ConditionGrade, type Passport } from '@clean-crep/shared';
import { BeforeAfter } from '@/components/before-after';
import { sampleFor } from '@/lib/work';

// Crep Passport: the public page behind the QR on a Crep Tag and the link we
// WhatsApp with a finished order (docs/VISION.md). Leads with the latest
// before/after (0029), then the care history. passport() returns null until the `passport` flag is on,
// so this 404s while the feature is hidden. No owner details, ever.

export const revalidate = 60;

function anon() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type Photos = { before: string | null; after: string } | null;

/** The showcased photos come through the passport-photo Edge Function (the bucket stays private). */
function photoUrl(code: string, kind: 'before' | 'after'): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/passport-photo?code=${encodeURIComponent(code)}&kind=${kind}`;
}

async function load(code: string): Promise<(Passport & { photos: Photos }) | null> {
  if (!/^[2-9A-Za-z]{8}$/.test(code)) return null;
  const { data, error } = await anon().rpc('passport', { p_code: code });
  if (error || !data) return null;
  const p = data as Passport;
  const sc = p.showcase;
  const photos: Photos = sc?.after ? { after: photoUrl(p.code, 'after'), before: sc.before ? photoUrl(p.code, 'before') : null } : null;
  return { ...p, photos };
}

function title(p: Passport): string {
  return pairTitle({ brand: p.brand, model: p.model, nickname: null, category: p.category });
}

function day(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-JM', { day: 'numeric', month: 'short', year: 'numeric' });
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const p = await load((await params).code);
  if (!p) return { title: 'Crep Passport · Clean Crep Jamaica', robots: { index: false } };
  const done = p.cleans.filter((c) => c.completed).length;
  const description = p.photos
    ? `Before and after: ${title(p)}, cleaned by Clean Crep Jamaica. ${done}× in our care since ${day(p.since)}.`
    : `Verified care history by Clean Crep Jamaica: cleaned ${done}× since ${day(p.since)}.`;
  return {
    title: `${title(p)} · Crep Passport`,
    description,
    robots: { index: false },
    // The after photo is the link preview in WhatsApp / Instagram DMs.
    // Next merges metadata shallowly, so the shared OG fields are repeated here.
    ...(p.photos
      ? {
          openGraph: {
            type: 'website',
            siteName: 'Clean Crep Jamaica',
            locale: 'en_JM',
            title: `${title(p)}, fresh again`,
            description,
            images: [{ url: p.photos.after, alt: `${title(p)} after a Clean Crep clean` }],
          },
          twitter: { card: 'summary_large_image', title: `${title(p)}, fresh again`, description, images: [p.photos.after] },
        }
      : {}),
  };
}

export default async function PassportPage({ params }: { params: Promise<{ code: string }> }) {
  const p = await load((await params).code);
  if (!p) notFound();
  const done = p.cleans.filter((c) => c.completed);
  // No photos yet: a tagged sample so the page never looks empty (never the link preview).
  const sample = p.photos ? null : sampleFor(p.category);
  const photos = done.reduce((n, c) => n + c.photos, 0);
  // Condition (Phase 2) shows only once condition_grade is launched.
  const { data: gradeOn } = await anon().rpc('feature_enabled', { p_key: 'condition_grade' });
  const lastAfter = gradeOn
    ? ([...p.events].reverse().find((e) => e.kind === 'grade' && (e.data as unknown as ConditionGrade).stage === 'after')?.data as unknown as ConditionGrade | undefined)
    : undefined;
  const display = 'var(--font-archivo), system-ui, sans-serif';

  return (
    <main style={{ minHeight: '100vh', background: colors.offWhite, color: colors.navy }}>
      <section style={{ background: colors.navy, color: colors.white, padding: '28px 20px 40px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: colors.white, textDecoration: 'none' }}>
            <Image src="/assets/logo-cropped.png" alt="" width={32} height={32} style={{ borderRadius: '50%' }} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>Clean Crep Jamaica</span>
          </Link>
          <div style={{ marginTop: 36, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: colors.softBlue }}>Crep Passport</div>
          <h1 style={{ fontFamily: display, fontWeight: 800, fontSize: 'clamp(32px, 8vw, 48px)', lineHeight: 1.05, margin: '10px 0 6px' }}>{title(p)}</h1>
          {p.colorway && <div style={{ fontSize: 17, color: colors.softBlue }}>{p.colorway}</div>}
          <div style={{ marginTop: 22, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <span
              data-testid="passport-code"
              style={{ fontFamily: display, fontWeight: 700, letterSpacing: 4, fontSize: 15, padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)' }}
            >
              {p.code}
            </span>
            <span style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, color: colors.white }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.softBlue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              Verified by Clean Crep
            </span>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 640, margin: '-20px auto 0', padding: '0 20px 48px' }}>
        {sample && (
          <div data-testid="passport-sample" style={{ marginBottom: 20 }}>
            <BeforeAfter pairs={[{ n: 1, beforeUrl: sample.before, afterUrl: sample.after, label: title(p), sample: true }]} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <div style={{ fontSize: 14, color: colors.caption }}>Sample photos · this item&apos;s own before/after shows here after its next clean</div>
              <Link
                href="/#book"
                style={{ background: colors.blue, color: colors.white, textDecoration: 'none', fontWeight: 700, fontSize: 15, padding: '12px 18px', borderRadius: 999, whiteSpace: 'nowrap' }}
              >
                Book a clean
              </Link>
            </div>
          </div>
        )}
        {p.photos && p.showcase && (
          <div data-testid="passport-showcase" style={{ marginBottom: 20 }}>
            {p.photos.before ? (
              <BeforeAfter pairs={[{ n: 1, beforeUrl: p.photos.before, afterUrl: p.photos.after, label: title(p) }]} />
            ) : (
              <div style={{ position: 'relative', aspectRatio: '4 / 3', borderRadius: 20, overflow: 'hidden', boxShadow: '0 12px 28px rgba(10,31,68,0.18)' }}>
                <Image src={p.photos.after} alt={`${title(p)} after cleaning`} fill unoptimized style={{ objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <div style={{ fontSize: 14, color: colors.caption }}>
                {p.showcase.service} · {day(p.showcase.date)}
              </div>
              <Link
                href="/#book"
                data-testid="passport-book"
                style={{ background: colors.blue, color: colors.white, textDecoration: 'none', fontWeight: 700, fontSize: 15, padding: '12px 18px', borderRadius: 999, whiteSpace: 'nowrap' }}
              >
                Book your clean
              </Link>
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            [String(done.length), done.length === 1 ? 'Clean' : 'Cleans'],
            lastAfter ? [`${lastAfter.score}/10`, 'Condition'] : [String(photos), 'Photos on file'],
            [new Date(`${p.since}T12:00:00`).getFullYear().toString(), 'In our care since'],
          ].map(([v, l]) => (
            <div key={l} style={{ background: colors.white, borderRadius: 16, padding: '16px 14px', boxShadow: '0 1px 2px rgba(10,31,68,0.06), 0 8px 24px rgba(10,31,68,0.06)' }}>
              <div style={{ fontFamily: display, fontWeight: 800, fontSize: 26 }}>{v}</div>
              <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.caption, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: colors.caption, margin: '32px 0 12px', fontWeight: 500 }}>Care history</h2>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, borderLeft: `2px solid ${colors.border}` }}>
          {p.cleans.length === 0 && <li style={{ padding: '4px 0 4px 18px', color: colors.caption, fontSize: 15 }}>No cleans recorded yet.</li>}
          {[...p.cleans].reverse().map((c, i) => (
            <li key={i} style={{ position: 'relative', padding: '4px 0 18px 18px' }}>
              <span
                style={{ position: 'absolute', left: -7, top: 8, width: 12, height: 12, borderRadius: 6, background: c.completed ? colors.blue : colors.border, border: `2px solid ${colors.offWhite}` }}
              />
              <div style={{ fontSize: 16, fontWeight: 500 }}>{c.service}</div>
              <div style={{ fontSize: 14, color: colors.caption }}>
                {day(c.date)}
                {c.completed ? '' : ' · in progress'}
                {c.photos ? ` · ${c.photos} photo${c.photos === 1 ? '' : 's'}` : ''}
              </div>
            </li>
          ))}
        </ol>

        <div style={{ marginTop: 28, background: colors.white, borderRadius: 16, padding: 20, border: `1px solid ${colors.border}` }}>
          <div style={{ fontFamily: display, fontWeight: 800, fontSize: 20 }}>Keep yours fresh too.</div>
          <p style={{ fontSize: 15, color: colors.caption, margin: '6px 0 16px', lineHeight: 1.5 }}>
            Sneaker, Clarks and cap cleaning in Half Way Tree. Everything we clean gets its own Crep Passport.
          </p>
          <Link
            href="/#book"
            style={{ display: 'inline-block', background: colors.blue, color: colors.white, textDecoration: 'none', fontWeight: 700, fontSize: 16, padding: '14px 22px', borderRadius: 14 }}
          >
            Book a clean
          </Link>
        </div>
      </section>
    </main>
  );
}
