import type { OrderStatus } from './status';

export type DropMethod = 'dropoff' | 'pickup';

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
}

export interface Order {
  id: string;
  order_number: string; // e.g. "CC-0041"
  customer_id: string;
  service_id: string;
  item_name: string;
  status: OrderStatus;
  drop_method: DropMethod;
  scheduled_date: string; // ISO date
  notes: string | null;
  price_cents: number | null;
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

/** Formats a nullable JMD price in cents as the prototype does ("$2,000" or "Quote"). */
export function formatPrice(priceCents: number | null): string {
  if (priceCents === null) return 'Quote';
  return `$${(priceCents / 100).toLocaleString('en-JM', { maximumFractionDigits: 0 })}`;
}
