'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { colors } from '@clean-crep/shared';
import { createClient } from '@/lib/supabase/client';

export function PrintCard({ pairId, title, colorway, code, qrSvg, url }: { pairId: string; title: string; colorway: string | null; code: string; qrSvg: string; url: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [logged, setLogged] = useState(false);

  async function print() {
    window.print();
    // Shows on the passport as "Crep Card issued".
    if (!logged) {
      await supabase.from('pair_events').insert({ pair_id: pairId, kind: 'tag_attached', data: { type: 'crep_card' } });
      setLogged(true);
    }
  }

  return (
    <div className="crep-card-page" style={{ minHeight: '100vh', background: colors.offWhite, display: 'grid', placeItems: 'center', gap: 24, padding: 24 }}>
      <style>{`
        @page { size: 85mm 55mm; margin: 0; }
        @media print {
          body * { visibility: hidden; }
          .crep-card, .crep-card * { visibility: visible; }
          .crep-card { position: fixed; inset: 0; box-shadow: none !important; border-radius: 0 !important; }
          .crep-card-page { background: none !important; }
        }
      `}</style>

      <div
        className="crep-card"
        data-testid="crep-card"
        style={{
          width: '85mm',
          height: '55mm',
          background: colors.white,
          borderRadius: 12,
          boxShadow: '0 1px 2px rgba(10,31,68,0.08), 0 12px 32px rgba(10,31,68,0.12)',
          display: 'flex',
          overflow: 'hidden',
          fontFamily: 'var(--font-dm-sans), sans-serif',
          color: colors.navy,
        }}
      >
        <div style={{ flex: 1, background: colors.navy, color: colors.white, padding: '5mm', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '2.4mm', letterSpacing: '0.5mm', textTransform: 'uppercase', color: colors.softBlue }}>Crep Passport</div>
          <div style={{ fontFamily: 'var(--font-archivo), sans-serif', fontWeight: 800, fontSize: '4.6mm', lineHeight: 1.1, marginTop: '1.5mm' }}>{title}</div>
          {colorway && <div style={{ fontSize: '2.8mm', color: colors.softBlue, marginTop: '0.8mm' }}>{colorway}</div>}
          <div style={{ marginTop: 'auto', fontFamily: 'var(--font-archivo), sans-serif', fontWeight: 700, fontSize: '3.6mm', letterSpacing: '0.9mm' }}>{code}</div>
          <div style={{ fontSize: '2.2mm', color: colors.softBlue, marginTop: '0.6mm' }}>Verified care history · Clean Crep Jamaica</div>
        </div>
        <div style={{ width: '30mm', padding: '4mm', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5mm' }}>
          <div style={{ width: '22mm', height: '22mm' }} dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <div style={{ fontSize: '2.2mm', textAlign: 'center', lineHeight: 1.3, color: colors.caption }}>Scan for its care history</div>
          <div style={{ fontSize: '1.9mm', color: colors.caption }}>{url}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={print}
          style={{ height: 44, padding: '0 20px', borderRadius: 10, border: 'none', background: colors.blue, color: colors.white, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
        >
          Print Crep Card
        </button>
        <Link href="/staff/dashboard" style={{ height: 44, padding: '0 16px', borderRadius: 10, border: `1px solid ${colors.border}`, color: colors.navy, fontSize: 15, display: 'grid', placeItems: 'center', textDecoration: 'none' }}>
          Back
        </Link>
      </div>
      <p style={{ fontSize: 13, color: colors.caption, maxWidth: 360, textAlign: 'center', margin: 0 }}>
        Card size 85 × 55 mm. Goes in the pickup bag or shoebox, never on the shoe.
        {logged ? ' Logged on the passport.' : ''}
      </p>
    </div>
  );
}
