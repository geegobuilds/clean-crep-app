import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { colors, pairTitle, passportUrl, type Pair } from '@clean-crep/shared';
import { createClient } from '@/lib/supabase/server';
import { PrintCard } from './print-card';

// Crep Card (docs/VISION.md): a business-card-sized card with the pair's
// passport QR. Shoes get washed, so nothing is stuck on the shoe: the card
// goes in the pickup bag / shoebox. Printed on demand from a label or card
// printer, so there's no pre-printed stock. Staff-only (dashboard layout).

export default async function PrintCrepCard({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('pairs')
    .select('id, brand, model, nickname, category, colorway, passport_code')
    .eq('passport_code', code.toUpperCase())
    .maybeSingle();
  const pair = data as Pick<Pair, 'id' | 'brand' | 'model' | 'nickname' | 'category' | 'colorway' | 'passport_code'> | null;
  if (!pair) notFound();

  const url = passportUrl(pair.passport_code);
  const qr = await QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: colors.navy, light: '#0000' } });

  return <PrintCard pairId={pair.id} title={pairTitle(pair)} colorway={pair.colorway} code={pair.passport_code} qrSvg={qr} url={url.replace('https://www.', '')} />;
}
