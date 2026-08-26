// Order status — ported 1:1 from the `STATUS_STYLES` object and the
// `STEPS` progress bar in project/app-screens.jsx / Operator Dashboard.html.
// Both prototypes treat status as one flat, mutually-exclusive value (this
// is what the DB enum below mirrors) — the 4-step progress bar is a
// *display* derivation from that single value, not a separate field.

export type OrderStatus =
  | 'received'
  | 'in_progress'
  | 'ready_for_pickup'
  | 'completed'
  | 'pending_payment';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  received: 'Received',
  in_progress: 'In Progress',
  ready_for_pickup: 'Ready for Pickup',
  completed: 'Completed',
  pending_payment: 'Pending Payment',
};

export const STATUS_STYLES: Record<OrderStatus, { bg: string; fg: string }> = {
  received: { bg: '#F5F7FA', fg: '#5A6A8A' },
  in_progress: { bg: '#D6EAF8', fg: '#1A6FD4' },
  ready_for_pickup: { bg: '#E8F1FB', fg: '#0A1F44' },
  completed: { bg: '#0A1F44', fg: '#FFFFFF' },
  pending_payment: { bg: '#FEF3F0', fg: '#993C1D' },
};

// Order Tracker screen's 4-step progress bar.
export const TRACKER_STEPS = ['Received', 'In Progress', 'Ready', 'Picked Up'] as const;

/**
 * Maps a flat order status to a step index (1-4) on the tracker's progress
 * bar. `pending_payment` is an exceptional state orthogonal to cleaning
 * progress in the original design (it only appears in the dashboard's
 * status list, never in the customer-facing tracker) — treated as "not
 * started" (0) here since the prototype never defined this case.
 */
export function stepFromStatus(status: OrderStatus): number {
  switch (status) {
    case 'received':
      return 1;
    case 'in_progress':
      return 2;
    case 'ready_for_pickup':
      return 3;
    case 'completed':
      return 4;
    case 'pending_payment':
    default:
      return 0;
  }
}

export const DASHBOARD_STATUS_FLOW: OrderStatus[] = [
  'received',
  'in_progress',
  'ready_for_pickup',
  'completed',
  'pending_payment',
];
