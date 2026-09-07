import type { OrderStatus } from './status';

export type DropMethod = 'dropoff' | 'pickup';

// A shop location — one row per franchise/branch. Today there's exactly
// one ('kingston-hwt'); this exists so a future parish or overseas
// franchise is a new row, not a schema change. 'coming_soon' is reserved
// for a not-yet-built waitlist feature — no UI reads it yet.
export interface Location {
  id: string;
  slug: string;
  name: string;
  country: string;
  currency: string; // ISO 4217, e.g. "JMD"
  address_line1: string | null;
  address_line2: string | null;
  whatsapp_number: string | null;
  status: 'open' | 'coming_soon';
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  loyalty_points: number;
  member_since: string; // ISO date
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  location_id: string;
}

export interface Service {
  id: string;
  name: string;
  price_cents: number | null; // null => "Quote"
  note: string;
  description: string;
  icon: string;
  popular: boolean;
  active: boolean;
  location_id: string;
  currency: string; // ISO 4217, e.g. "JMD"
}

export type OrderSource = 'app' | 'creppie';

export interface Order {
  id: string;
  order_number: string; // e.g. "CC-0041"
  // Null on a Creppie (WhatsApp/IG) booking — that customer hasn't signed
  // into the app, so guest_* below carries their contact info instead.
  customer_id: string | null;
  // Null when Creppie's free-text service name didn't resolve to a
  // catalog row — item_name is still the source of truth for what was
  // booked.
  service_id: string | null;
  location_id: string;
  item_name: string;
  status: OrderStatus;
  drop_method: DropMethod;
  scheduled_date: string; // ISO date
  notes: string | null;
  price_cents: number | null;
  currency: string; // ISO 4217, copied from the service at booking time
  source: OrderSource;
  external_ref: string | null; // Airtable record id, for Creppie-sourced orders
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  guest_instagram_handle: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderStatusEvent {
  id: string;
  order_id: string;
  status: OrderStatus;
  changed_by: string | null;
  created_at: string;
}

export type NotificationType = 'ready' | 'progress' | 'promo' | 'received' | 'complete';

export interface Notification {
  id: string;
  customer_id: string;
  order_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

/**
 * Formats a nullable JMD price in cents as the prototype does ("$2,000" or
 * "Quote"). Every row is JMD today, so this doesn't branch on `currency`
 * yet — revisit once a second-currency location exists.
 */
export function formatPrice(priceCents: number | null): string {
  if (priceCents === null) return 'Quote';
  return `$${(priceCents / 100).toLocaleString('en-JM', { maximumFractionDigits: 0 })}`;
}
