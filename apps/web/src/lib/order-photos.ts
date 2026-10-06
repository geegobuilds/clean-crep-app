'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

export const ORDER_PHOTOS_BUCKET = 'order-photos';
export type PhotoKind = 'before' | 'after';

export interface OrderPhoto {
  id: string;
  kind: PhotoKind;
  storage_path: string;
  created_at: string;
  url: string | null; // signed, 1 hour
}

/** Every photo on an order, newest first, with signed URLs (the bucket is private). */
export async function listOrderPhotos(supabase: SupabaseClient, orderId: string): Promise<OrderPhoto[]> {
  const { data, error } = await supabase
    .from('order_photos')
    .select('id, kind, storage_path, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });
  if (error || !data?.length) return [];
  const { data: signed } = await supabase.storage.from(ORDER_PHOTOS_BUCKET).createSignedUrls(
    data.map((p) => p.storage_path),
    60 * 60
  );
  return data.map((p) => ({ ...(p as Omit<OrderPhoto, 'url'>), url: signed?.find((s) => s.path === p.storage_path)?.signedUrl ?? null }));
}

/**
 * Phone photos are 3–8 MB. Shrink to 1600px on the long side as JPEG so the
 * upload is quick on shop Wi‑Fi / mobile data. Falls back to the original file
 * if the browser can't decode it (e.g. HEIC on desktop Chrome).
 */
export async function shrinkPhoto(file: File, max = 1600): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.85));
  } catch {
    return file;
  }
}

/** Upload the file, then register it on the order. Cleans up the file if the row fails. */
export async function uploadOrderPhoto(supabase: SupabaseClient, orderId: string, kind: PhotoKind, file: File) {
  const blob = await shrinkPhoto(file);
  const jpeg = blob.type === 'image/jpeg';
  const ext = jpeg ? 'jpg' : (file.name.split('.').pop() ?? 'jpg').toLowerCase();
  const path = `${orderId}/${kind}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(ORDER_PHOTOS_BUCKET)
    .upload(path, blob, { contentType: jpeg ? 'image/jpeg' : file.type || 'image/jpeg', upsert: false });
  if (upErr) throw upErr;
  const { error: rowErr } = await supabase.from('order_photos').insert({ order_id: orderId, kind, storage_path: path });
  if (rowErr) {
    await supabase.storage.from(ORDER_PHOTOS_BUCKET).remove([path]);
    throw rowErr;
  }
  return path;
}
