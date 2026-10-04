import { useState } from 'react';
import { fontFamily, palette } from '@clean-crep/shared';
import { Icon } from '@/components/icon';
import { Button } from '@/components/ui';
import { c } from '@/theme';

// Web share: draw the same watermarked card on a canvas (the bucket's signed
// URLs allow CORS), then use the Web Share API, or download as a fallback.

export interface ShareProps {
  before: string;
  after: string;
  itemName: string;
  orderNumber: string;
  onPress?: () => void;
}

const W = 1080;
const H = 1350;
const BAND = 276;

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Draw `img` into the box, cropped to cover it. */
function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

function pill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.font = `32px ${fontFamily.bold}, sans-serif`;
  const w = ctx.measureText(text).width + 48;
  ctx.fillStyle = 'rgba(10,31,68,0.72)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, 56, 28);
  ctx.fill();
  ctx.fillStyle = palette.white;
  ctx.fillText(text, x + 24, y + 40);
}

export async function composeShareImage({ before, after, itemName, orderNumber }: ShareProps): Promise<Blob> {
  const [b, a] = await Promise.all([load(before), load(after)]);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = palette.navy;
  ctx.fillRect(0, 0, W, H);
  const half = (W - 6) / 2;
  cover(ctx, b, 0, 0, half, H - BAND);
  cover(ctx, a, half + 6, 0, half, H - BAND);
  pill(ctx, 'BEFORE', 30, 30);
  pill(ctx, 'AFTER', half + 36, 30);
  ctx.fillStyle = palette.white;
  // Expo registers the loaded fonts under these family names.
  ctx.font = `66px ${fontFamily.display}, sans-serif`;
  ctx.fillText('Cleaned by Clean Crep', 48, H - BAND + 130);
  ctx.fillStyle = palette.onNavyMuted;
  ctx.font = `36px ${fontFamily.regular}, sans-serif`;
  ctx.fillText(`${itemName} · ${orderNumber} · cleancrep.com`, 48, H - BAND + 190, W - 96);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas'))), 'image/jpeg', 0.92));
}

export function ShareButton(props: ShareProps) {
  const [busy, setBusy] = useState(false);

  async function share() {
    props.onPress?.();
    setBusy(true);
    try {
      const blob = await composeShareImage(props);
      const file = new File([blob], `clean-crep-${props.orderNumber}.jpg`, { type: 'image/jpeg' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Cleaned by Clean Crep' });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } catch (e) {
      console.warn('[share]', e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      testID="share-photos"
      variant="secondary"
      label={busy ? 'Preparing…' : 'Share'}
      icon={<Icon name="share" size={18} color={c.navy} />}
      onPress={share}
      disabled={busy}
    />
  );
}
