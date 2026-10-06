// The Vault and Crep Passport (migrations 0020/0021, docs/VISION.md).

export type PairCategory = 'sneaker' | 'clarks' | 'cap' | 'other';

export interface Pair {
  id: string;
  customer_id: string | null;
  guest_key: string | null;
  category: PairCategory;
  brand: string | null;
  model: string | null;
  colorway: string | null;
  size: string | null;
  nickname: string | null;
  est_value_cents: number | null;
  passport_code: string;
  passport_public: boolean;
  created_at: string;
  updated_at: string;
}

/** What the public passport(code) RPC returns. No owner details. */
export interface Passport {
  code: string;
  category: PairCategory;
  brand: string | null;
  model: string | null;
  colorway: string | null;
  since: string; // ISO date
  cleans: { date: string; service: string; completed: boolean; photos: number }[];
  events: { kind: 'tag_attached' | 'grade' | 'authenticity_check'; date: string; data: Record<string, unknown> }[];
}

export const SITE_URL = 'https://www.cleancrep.com';

export function passportUrl(code: string): string {
  return `${SITE_URL}/p/${code}`;
}

/** "Nike Air Force 1", else the nickname, else "Sneakers". */
export function pairTitle(p: Pick<Pair, 'brand' | 'model' | 'nickname' | 'category'>): string {
  const bm = [p.brand, p.model].filter(Boolean).join(' ').trim();
  return bm || p.nickname || (p.category === 'clarks' ? 'Clarks' : p.category === 'cap' ? 'Cap' : 'Sneakers');
}
