// Clean Crep Club, the care membership (migrations 0020/0022, docs/VISION.md).

export type MembershipStatus = 'pending' | 'active' | 'paused' | 'cancelled';

export interface MembershipPlan {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  credits_per_month: number;
  rollover_max: number;
  max_household: number;
  perks: string[];
  active: boolean;
  sort_order: number;
}

/** What my_membership() returns for the signed-in customer. */
export interface MyMembership {
  id: string;
  status: MembershipStatus;
  is_owner: boolean;
  payment_ref: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  balance: number;
  plan: Pick<MembershipPlan, 'slug' | 'name' | 'price_cents' | 'credits_per_month' | 'rollover_max' | 'max_household' | 'perks'>;
  household: { name: string }[];
  ledger: { delta: number; reason: 'grant' | 'rollover' | 'redeem' | 'expire' | 'adjust' | 'refund'; note: string | null; created_at: string }[];
}

export const CLUB_WHATSAPP = '18765072163';
