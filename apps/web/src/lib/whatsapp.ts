// WhatsApp click-to-chat links for the staff dashboard. Staff send from their
// own WhatsApp (wa.me opens the app with the message typed in); nothing is sent
// on our side, so there is no API, cost or opt-in to manage.

import type { OrderStatus } from '@clean-crep/shared';

export const SITE_URL = 'https://www.cleancrep.com';

/**
 * A phone number as wa.me wants it (digits with country code). Jamaican local
 * forms get the 1-876 prefix: 7 digits -> 1876…, 10 digits (876…) -> 1876….
 * Anything longer is taken to carry its country code already.
 */
export function waNumber(phone: string | null | undefined): string {
  const d = (phone ?? '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length === 7) return `1876${d}`;
  if (d.length === 10) return `1${d}`;
  return d;
}

/** A wa.me link with the message typed in; no number opens the chat picker. */
export function waLink(phone: string | null | undefined, text: string): string {
  return `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;
}

/**
 * The message staff send when an item is ready or done: what's happening, plus
 * its Crep Passport link (before/after, care history). "Before & after" is only
 * promised when an after photo is on the order.
 */
export function passportMessage(o: {
  name: string;
  item: string;
  status: OrderStatus;
  method: 'dropoff' | 'pickup' | null;
  passportCode: string | null;
  hasAfterPhoto: boolean;
}): string {
  const first = o.name.trim().split(/\s+/)[0] || 'there';
  const link = o.passportCode ? `${SITE_URL}/p/${o.passportCode}` : null;
  const see = link ? (o.hasAfterPhoto ? ` See the before & after: ${link}` : ` Its Crep Passport (care history): ${link}`) : '';

  if (o.status === 'ready_for_pickup') {
    const where = o.method === 'pickup' ? "we'll bring it back to you soon" : 'ready for pickup at the shop';
    return `Wah gwaan ${first}! Your ${o.item} is clean and ${where} 🙌${see}`;
  }
  if (o.status === 'completed') {
    return link
      ? `Thanks for trusting Clean Crep with your ${o.item}, ${first}! Here's its Crep Passport with ${o.hasAfterPhoto ? 'the before & after and ' : ''}its care history: ${link}`
      : `Thanks for trusting Clean Crep with your ${o.item}, ${first}! See you for the next clean.`;
  }
  return link
    ? `Hi ${first}, here's your ${o.item}'s Crep Passport. It keeps every clean on record: ${link}`
    : `Hi ${first}, quick update on your ${o.item} from Clean Crep.`;
}
