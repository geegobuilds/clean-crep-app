'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { colors } from '@clean-crep/shared';
import { createClient } from '@/lib/supabase/client';

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }
    const { data: staffRow } = await supabase.from('staff').select('id').eq('id', data.user.id).maybeSingle();
    if (!staffRow) {
      setError('This account is not set up for staff access.');
      await supabase.auth.signOut();
      setSubmitting(false);
      return;
    }
    router.push('/staff/dashboard');
    router.refresh();
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
          <Image src="/assets/logo-cropped.png" alt="Clean Crep JA" width={32} height={32} style={{ borderRadius: '50%' }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: colors.white }}>Clean Crep JA · Operator</span>
        </div>

        <form onSubmit={handleSubmit} style={{ background: colors.white, borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: colors.navy, marginBottom: 4 }}>Staff Login</div>
          <div style={{ fontSize: 12, color: colors.caption, marginBottom: 20 }}>Sign in to manage orders.</div>

          <Field label="EMAIL" value={email} onChange={setEmail} type="email" />
          <Field label="PASSWORD" value={password} onChange={setPassword} type="password" />

          {error && <div style={{ fontSize: 12, color: '#993C1D', marginBottom: 12 }}>{error}</div>}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              background: colors.blue,
              color: colors.white,
              border: 'none',
              borderRadius: 8,
              padding: '13px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>

          <Link href="/" style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 12, color: colors.blue, textDecoration: 'none' }}>
            ← Back to site
          </Link>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 500, color: colors.caption, letterSpacing: 2, marginBottom: 8 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        style={{
          width: '100%',
          border: `1px solid ${colors.border}`,
          borderRadius: 8,
          padding: '11px 14px',
          fontSize: 13,
          color: colors.charcoal,
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}
