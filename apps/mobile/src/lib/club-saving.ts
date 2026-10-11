import { formatPrice, type MembershipPlan, type MyMembership } from '@clean-crep/shared';
import type { OrderWithService } from '@/hooks/use-orders';

// The Club's one personal line: what it has saved a member, or what it would
// save someone who books as often as they do. Null when there's nothing honest to say.

export function memberSaving(m: MyMembership, orders: OrderWithService[]): string {
  // A credit covers the service's base price (add-ons and CrepRun are still charged).
  const covered = orders.filter((o) => (o.credits_used ?? 0) > 0).reduce((t, o) => t + (o.service?.price_cents ?? 0), 0);
  const paid = m.plan.price_cents * m.ledger.filter((l) => l.reason === 'grant').length;
  if (covered > paid && paid > 0) return `You've saved ${formatPrice(covered - paid)} with the Club.`;
  if (covered > 0) return `Your credits have covered ${formatPrice(covered)} of cleans so far.`;
  return "Your first credit's ready. Use it on your next clean.";
}

export function joinSaving(plans: MembershipPlan[], orders: OrderWithService[], now: number = Date.now()): { plan: MembershipPlan; line: string } | null {
  const recent = orders.filter((o) => o.service?.price_cents != null && now - Date.parse(o.created_at) <= 90 * 864e5);
  const n = recent.length;
  if (n < 2) return null;
  const avg = recent.reduce((t, o) => t + (o.service.price_cents ?? 0), 0) / n;
  let best: { plan: MembershipPlan; saving: number } | null = null;
  for (const p of plans) {
    const saving = Math.min(n / 3, p.credits_per_month) * avg - p.price_cents;
    if (!best || saving > best.saving) best = { plan: p, saving };
  }
  if (!best || best.saving <= 0) return null;
  const rounded = Math.round(best.saving / 10000) * 10000;
  return { plan: best.plan, line: `You booked ${n} cleans in the last 3 months. On ${best.plan.name} that's about ${formatPrice(rounded)} less a month.` };
}
