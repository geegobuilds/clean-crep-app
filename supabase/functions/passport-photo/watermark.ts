// Stamps the Clean Crep badge in the bottom-right corner of a photo. Plain
// imagescript (no Deno APIs) so the same code is checked in Node.
import { decode, Image } from 'npm:imagescript@1.3.0';

/** Photo bytes (JPEG/PNG) + badge PNG bytes → a JPEG, at most 1600px on the long side. */
export async function watermark(photo: Uint8Array, badgePng: Uint8Array): Promise<Uint8Array> {
  const img = await decode(photo);
  if (!(img instanceof Image)) throw new Error('not a still image');
  if (Math.max(img.width, img.height) > 1600) {
    if (img.width >= img.height) img.resize(1600, Image.RESIZE_AUTO);
    else img.resize(Image.RESIZE_AUTO, 1600);
  }
  const badge = await decode(badgePng);
  if (!(badge instanceof Image)) throw new Error('bad badge');
  const short = Math.min(img.width, img.height);
  badge.resize(Math.round(short * 0.3), Image.RESIZE_AUTO);
  const margin = Math.round(short * 0.035);
  img.composite(badge, img.width - badge.width - margin, img.height - badge.height - margin);
  return await img.encodeJPEG(85);
}
