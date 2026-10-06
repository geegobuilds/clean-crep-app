'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { colors, type FeatureFlag } from '@clean-crep/shared';
import { createClient } from '@/lib/supabase/client';

// Features: what's built but hidden (migration 0020, docs/VISION.md). Staff
// always see everything; add a customer's email to let them test a feature in
// the live app; "On for everyone" is the launch switch.

interface Tester {
  flag_key: string;
  user_id: string;
}
interface Person {
  id: string;
  name: string;
  email: string | null;
}

const card: React.CSSProperties = { background: colors.white, borderRadius: 14, border: `1px solid ${colors.border}`, padding: 20, marginBottom: 16 };
const input: React.CSSProperties = {
  height: 32,
  borderRadius: 7,
  border: `1px solid ${colors.border}`,
  padding: '0 10px',
  fontSize: 12,
  color: colors.charcoal,
  background: colors.white,
  fontFamily: 'inherit',
  minWidth: 220,
};
const btn: React.CSSProperties = { height: 32, borderRadius: 7, border: 'none', padding: '0 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' };

export default function FeaturesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [testers, setTesters] = useState<Tester[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [f, t] = await Promise.all([
      supabase.from('feature_flags').select('*').order('key'),
      supabase.from('feature_flag_users').select('flag_key,user_id'),
    ]);
    if (f.error || t.error) {
      setError("Couldn't load features. Refresh the page; if it keeps happening, check you're signed in as staff.");
      return;
    }
    setError(null);
    setFlags((f.data ?? []) as FeatureFlag[]);
    const rows = (t.data ?? []) as Tester[];
    setTesters(rows);
    const ids = [...new Set(rows.map((r) => r.user_id))];
    if (ids.length) {
      const { data } = await supabase.from('customers').select('id,name,email').in('id', ids);
      setPeople(Object.fromEntries(((data ?? []) as Person[]).map((p) => [p.id, p])));
    }
  }, [supabase]);

  useEffect(() => {
    // One-shot load after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  async function toggle(flag: FeatureFlag) {
    const turningOn = !flag.enabled_for_all;
    if (turningOn && !window.confirm(`Turn "${flag.key}" on for every customer?`)) return;
    const { error: e } = await supabase
      .from('feature_flags')
      .update({ enabled_for_all: turningOn, updated_at: new Date().toISOString() })
      .eq('key', flag.key);
    if (e) setError("Couldn't save that. Try again.");
    reload();
  }

  async function addTester(flagKey: string, email: string) {
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    const { data } = await supabase.from('customers').select('id,name,email').ilike('email', clean).limit(1);
    const person = (data ?? [])[0] as Person | undefined;
    if (!person) {
      setError(`No customer account with the email ${clean}. They need to sign up in the app or on the website first.`);
      return;
    }
    const { error: e } = await supabase.from('feature_flag_users').insert({ flag_key: flagKey, user_id: person.id });
    if (e && e.code !== '23505') setError("Couldn't add that tester. Try again.");
    else setError(null);
    reload();
  }

  async function removeTester(flagKey: string, userId: string) {
    await supabase.from('feature_flag_users').delete().eq('flag_key', flagKey).eq('user_id', userId);
    reload();
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.offWhite }}>
      <div style={{ background: colors.navy, height: 56, display: 'flex', alignItems: 'center', padding: '0 32px', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <Image src="/assets/logo-cropped.png" alt="Clean Crep" width={30} height={30} style={{ borderRadius: '50%', objectFit: 'cover' }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: colors.white }}>Clean Crep JA</span>
        <span style={{ fontSize: 11, color: 'rgba(168,200,240,0.6)', marginLeft: 2 }}>· Features</span>
        <Link href="/staff/dashboard" style={{ marginLeft: 'auto', fontSize: 12, color: colors.softBlue, textDecoration: 'none', fontWeight: 500 }}>
          ← Orders
        </Link>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
        <div style={{ fontSize: 12, color: colors.caption, marginBottom: 20, lineHeight: 1.6 }}>
          Built but hidden. Staff always see everything. Add a customer&apos;s email to let them test a feature in the live app.
          &quot;On for everyone&quot; is the launch switch.
        </div>
        {error && <div style={{ fontSize: 12, color: '#993C1D', marginBottom: 16 }}>{error}</div>}

        {flags.map((f) => (
          <FlagCard
            key={f.key}
            flag={f}
            testers={testers.filter((t) => t.flag_key === f.key).map((t) => people[t.user_id] ?? { id: t.user_id, name: 'Unknown account', email: null })}
            onToggle={() => toggle(f)}
            onAdd={(email) => addTester(f.key, email)}
            onRemove={(userId) => removeTester(f.key, userId)}
          />
        ))}
      </div>
    </div>
  );
}

function FlagCard({
  flag,
  testers,
  onToggle,
  onAdd,
  onRemove,
}: {
  flag: FeatureFlag;
  testers: Person[];
  onToggle: () => void;
  onAdd: (email: string) => void;
  onRemove: (userId: string) => void;
}) {
  const [email, setEmail] = useState('');
  return (
    <div style={card} data-testid={`flag-${flag.key}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: colors.navy }}>{flag.key}</div>
          <div style={{ fontSize: 12, color: colors.caption, marginTop: 4 }}>{flag.description}</div>
        </div>
        <button
          onClick={onToggle}
          aria-pressed={flag.enabled_for_all}
          style={{ ...btn, background: flag.enabled_for_all ? '#16A34A' : colors.offWhite, color: flag.enabled_for_all ? colors.white : colors.navy, border: `1px solid ${colors.border}` }}
        >
          {flag.enabled_for_all ? 'On for everyone' : 'Hidden'}
        </button>
      </div>
      <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {testers.map((t) => (
          <span key={t.id} style={{ fontSize: 11, background: colors.ice, color: colors.navy, borderRadius: 20, padding: '4px 10px' }}>
            {t.name}
            {t.email ? ` · ${t.email}` : ''}{' '}
            <button onClick={() => onRemove(t.id)} aria-label={`Remove ${t.name}`} style={{ border: 'none', background: 'none', cursor: 'pointer', color: colors.caption }}>
              ×
            </button>
          </span>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onAdd(email);
            setEmail('');
          }}
          style={{ display: 'flex', gap: 6 }}
        >
          <input style={input} type="email" placeholder="Tester's account email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" style={{ ...btn, background: colors.blue, color: colors.white }}>
            Add tester
          </button>
        </form>
      </div>
    </div>
  );
}
