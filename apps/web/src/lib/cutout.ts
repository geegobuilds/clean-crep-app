'use client';

// Background removal for product shots (0030), in the browser: no account, no
// cost, nothing leaves the shop's device. BiRefNet-lite (MIT licence) through
// transformers.js, both loaded from public CDNs the first time (~115 MB, then
// cached by the browser). WebGPU when the device has it (recent iPhone/Android
// browsers, laptops), otherwise plain WebAssembly (slower).

const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5';
const MODEL = 'onnx-community/BiRefNet_lite';

type RawImageLike = { width: number; height: number; channels: number; data: Uint8ClampedArray };
type Segmenter = (image: unknown) => Promise<RawImageLike[]>;

let segmenter: Promise<Segmenter> | null = null;
let onGpu = false;
let gpuFailed = false; // WebGPU loaded but failed to run: WebAssembly from now on

function loadSegmenter(): Promise<Segmenter> {
  segmenter ??= (async () => {
    const tf = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ TRANSFORMERS_URL);
    // Some browsers advertise WebGPU but can't run it (no adapter, no fp16), so
    // fall back to WebAssembly whenever the WebGPU pipeline won't load.
    onGpu = false;
    if (!gpuFailed && typeof navigator !== 'undefined' && 'gpu' in navigator) {
      try {
        const gpu = (await tf.pipeline('background-removal', MODEL, { device: 'webgpu', dtype: 'fp16' })) as Segmenter;
        onGpu = true;
        return gpu;
      } catch (e) {
        console.warn('[cutout] WebGPU unavailable, using WebAssembly', e);
      }
    }
    return (await tf.pipeline('background-removal', MODEL, { device: 'wasm', dtype: 'fp32' })) as Segmenter;
  })();
  segmenter.catch(() => (segmenter = null)); // try again next time
  return segmenter;
}

/**
 * A photo → a transparent PNG of just the item, cropped to it with a little
 * breathing room and at most `max` px on the long side.
 */
export async function makeCutout(photo: Blob, max = 1200): Promise<Blob> {
  const bitmap = await createImageBitmap(photo);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const src = document.createElement('canvas');
  src.width = Math.round(bitmap.width * scale);
  src.height = Math.round(bitmap.height * scale);
  src.getContext('2d')!.drawImage(bitmap, 0, 0, src.width, src.height);

  const input = src.toDataURL('image/jpeg', 0.92);
  let out: RawImageLike | undefined;
  try {
    [out] = await (await loadSegmenter())(input);
  } catch (e) {
    if (!onGpu) throw e;
    // WebGPU loaded but couldn't run this: switch to WebAssembly and retry once.
    console.warn('[cutout] WebGPU run failed, using WebAssembly', e);
    gpuFailed = true;
    segmenter = null;
    [out] = await (await loadSegmenter())(input);
  }
  if (!out || out.channels !== 4) throw new Error('no cutout');

  // Crop to what's left (alpha > 16), padded 6%.
  const { width: w, height: h, data } = out;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 16) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0 || (x1 - x0) * (y1 - y0) < w * h * 0.02) throw new Error('nothing found');
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.06);
  const cx = Math.max(0, x0 - pad), cy = Math.max(0, y0 - pad);
  const cw = Math.min(w, x1 + pad + 1) - cx, ch = Math.min(h, y1 + pad + 1) - cy;

  const full = document.createElement('canvas');
  full.width = w;
  full.height = h;
  full.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(data), w, h), 0, 0);
  const crop = document.createElement('canvas');
  crop.width = cw;
  crop.height = ch;
  crop.getContext('2d')!.drawImage(full, cx, cy, cw, ch, 0, 0, cw, ch);
  return await new Promise<Blob>((resolve, reject) => crop.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png'));
}
