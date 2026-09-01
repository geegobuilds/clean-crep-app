'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { colors } from '@clean-crep/shared';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords don’t match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }
    setDone(true);
    setTimeout(() => router.push('/staff/login'), 1500);
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: colors.white, textAlign: 'center', marginBottom: 28 }}>
          Clean Crep JA &middot; Operator
        </div>

        <form onSubmit={handleSubmit} style={{ background: colors.white, borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: colors.navy, marginBottom: 4 }}>Set a New Password</div>
          <div style={{ fontSize: 12, color: colors.caption, marginBottom: 20 }}>
            {done ? 'Password updated — redirecting to sign in…' : 'Choose a password for this staff account.'}
          </div>

          {!done && (
            <>
              <Field label="NEW PASSWORD" value={password} onChange={setPassword} />
              <Field label="CONFIRM PASSWORD" value={confirm} onChange={setConfirm} />

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
                {submitting ? 'Saving…' : 'Save Password'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 500, color: colors.caption, letterSpacing: 2, marginBottom: 8 }}>{label}</label>
      <input
        type="password"
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
