import { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { CLUB_WHATSAPP, formatPrice, type MembershipPlan, type MyMembership } from '@clean-crep/shared';
import { Icon } from '@/components/icon';
import { Button, Card, Overline, ScreenHeader } from '@/components/ui';
import { ErrorState, SignInPrompt, SkeletonList } from '@/components/states';
import { useFeatureState } from '@/hooks/use-features';
import { useMembership } from '@/hooks/use-membership';
import { useServices } from '@/hooks/use-services';
import { useAuth } from '@/lib/auth';
import { tapLight } from '@/lib/haptics';
import { c, elevation, radius, space, type } from '@/theme';

// Clean Crep Club (docs/VISION.md, Phase 3): monthly care credits. Join here,
// pay by transfer / Lynk (WhatsApp the reference), staff activate it, then a
// credit covers a clean at booking. Hidden unless `membership` is on.

function day(iso: string | null): string {
  return iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('en-JM', { day: 'numeric', month: 'short' }) : '—';
}

function whatsapp(text: string) {
  Linking.openURL(`https://wa.me/${CLUB_WHATSAPP}?text=${encodeURIComponent(text)}`);
}

export default function ClubScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { features, loaded } = useFeatureState();
  const { membership, plans, loading, error, reload, join } = useMembership();
  const { services } = useServices();
  const [changing, setChanging] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const cleanPrice = services.find((s) => s.name === 'Sneaker Clean')?.price_cents ?? null;

  if (loaded && !features.has('membership')) return <Redirect href="/" />;

  async function onJoin(slug: string) {
    tapLight();
    setJoining(slug);
    const err = await join(slug);
    setJoining(null);
    setJoinError(err);
    if (!err) setChanging(false);
  }

  const showPlans = !membership || (membership.status === 'pending' && changing);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScreenHeader
        title="Clean Crep Club"
        subtitle="Monthly care for every pair you own."
        left={
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
            <Icon name="chevronL" size={24} color={c.navy} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl }}>
        {!session && (
          <SignInPrompt title="Sign in to join the Club" body="Care credits every month, rolled over when you don't use them." where="club" onSignIn={() => router.push('/sign-in')} />
        )}
        {session && loading && <SkeletonList count={2} />}
        {session && !loading && error && <ErrorState message={error} onRetry={reload} />}

        {session && !loading && !error && membership && membership.status !== 'pending' && (
          <MemberCard m={membership} onBook={() => router.push('/book')} />
        )}
        {session && !loading && !error && membership?.status === 'pending' && !changing && (
          <PendingCard m={membership} onChange={() => setChanging(true)} />
        )}

        {session && !loading && !error && showPlans && (
          <View style={{ gap: space.md }}>
            {plans.length === 0 && (
              <Card bordered>
                <Text style={type.body}>Plans are coming soon.</Text>
              </Card>
            )}
            {plans.map((p) => (
              <PlanCard key={p.id} plan={p} cleanPrice={cleanPrice} busy={joining === p.slug} current={membership?.plan.slug === p.slug} onJoin={() => onJoin(p.slug)} />
            ))}
            {joinError && <Text style={[type.body, { color: c.danger }]}>{joinError}</Text>}
            <Text style={[type.caption, { textAlign: 'center' }]}>No contracts. Pay monthly by transfer, Lynk or cash. Stop any time.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({ plan, cleanPrice, busy, current, onJoin }: { plan: MembershipPlan; cleanPrice: number | null; busy: boolean; current: boolean; onJoin: () => void }) {
  const worth = cleanPrice ? plan.credits_per_month * cleanPrice : null;
  return (
    <View testID="club-plan" style={[{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.lg, gap: space.sm }, elevation.card]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={type.headline}>{plan.name}</Text>
        {plan.max_household > 1 && <Text style={type.caption}>Up to {plan.max_household} people</Text>}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text style={type.priceLg}>{formatPrice(plan.price_cents)}</Text>
        <Text style={type.caption}>/ month</Text>
      </View>
      {worth !== null && worth > plan.price_cents && (
        <Text style={[type.bodyStrong, { color: c.accent }]}>
          {plan.credits_per_month} cleans worth {formatPrice(worth)}. You save {formatPrice(worth - plan.price_cents)}.
        </Text>
      )}
      <View style={{ gap: 6, marginTop: space.xxs }}>
        {plan.perks.map((perk) => (
          <View key={perk} style={{ flexDirection: 'row', gap: space.xs, alignItems: 'flex-start' }}>
            <Icon name="check" size={18} color={c.accent} />
            <Text style={[type.body, { flex: 1 }]}>{perk}</Text>
          </View>
        ))}
      </View>
      <Button label={busy ? 'Joining…' : current ? 'Selected' : `Join ${plan.name}`} disabled={busy || current} onPress={onJoin} style={{ marginTop: space.xs }} />
    </View>
  );
}

function PendingCard({ m, onChange }: { m: MyMembership; onChange: () => void }) {
  const msg = `Hi Clean Crep! I'd like to join ${m.plan.name} (${formatPrice(m.plan.price_cents)}/month). My reference is ${m.payment_ref}.`;
  return (
    <View testID="club-pending" style={{ backgroundColor: c.navy, borderRadius: radius.lg, padding: space.lg, gap: space.sm }}>
      <Text style={[type.overline, { color: c.onNavyMuted }]}>Almost in · {m.plan.name}</Text>
      <Text style={[type.title, { color: c.white }]}>One step left.</Text>
      <Text style={[type.body, { color: c.onNavyMuted }]}>
        Send {formatPrice(m.plan.price_cents)} by bank transfer or Lynk and WhatsApp us your reference. We switch your credits on the same day.
      </Text>
      <View style={{ borderWidth: 1, borderColor: c.onNavyLine, borderRadius: radius.md, padding: space.md, alignItems: 'center' }}>
        <Text style={[type.overline, { color: c.onNavyMuted }]}>Your reference</Text>
        <Text style={[type.title, { color: c.white, letterSpacing: 4 }]}>{m.payment_ref}</Text>
      </View>
      <Button label="Send on WhatsApp" icon={<Icon name="wa" size={18} color={c.white} />} onPress={() => whatsapp(msg)} />
      <Button variant="onDark" compact label="Change plan" onPress={onChange} />
    </View>
  );
}

function MemberCard({ m, onBook }: { m: MyMembership; onBook: () => void }) {
  const paused = m.status === 'paused';
  const renewSoon = !!m.current_period_end && new Date(`${m.current_period_end}T12:00:00`).getTime() - Date.now() < 5 * 864e5;
  const renewMsg = `Hi Clean Crep! I'd like to renew my ${m.plan.name} (${formatPrice(m.plan.price_cents)}). Reference ${m.payment_ref}.`;
  return (
    <View style={{ gap: space.lg }}>
      <View testID="club-member" style={{ backgroundColor: c.navy, borderRadius: radius.lg, padding: space.lg, gap: space.xs }}>
        <Text style={[type.overline, { color: c.onNavyMuted }]}>{m.plan.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.xs }}>
          <Text style={{ fontFamily: type.display.fontFamily, fontSize: 64, lineHeight: 68, color: c.white }}>{m.balance}</Text>
          <Text style={[type.headline, { color: c.white }]}>care credit{m.balance === 1 ? '' : 's'}</Text>
        </View>
        <Text style={[type.body, { color: c.onNavyMuted }]}>
          {paused ? 'Paused. Renew to use your credits again.' : `${m.plan.credits_per_month} new every month · renews ${day(m.current_period_end)}`}
        </Text>
        <View style={{ gap: space.sm, marginTop: space.sm }}>
          {!paused && m.balance > 0 && <Button label="Book with a credit" onPress={onBook} />}
          {(paused || renewSoon) && <Button variant={paused ? 'primary' : 'onDark'} label="Renew on WhatsApp" icon={<Icon name="wa" size={18} color={c.white} />} onPress={() => whatsapp(renewMsg)} />}
        </View>
      </View>

      {m.plan.max_household > 1 && (
        <Card bordered style={{ gap: space.xs }}>
          <Overline>Household</Overline>
          <Text style={type.body}>{m.household.length ? m.household.map((h) => h.name).join(', ') : 'Just you so far.'}</Text>
          <Text style={type.caption}>
            Up to {m.plan.max_household} people share these credits. WhatsApp us their account emails to add them.
          </Text>
        </Card>
      )}

      {m.ledger.length > 0 && (
        <View style={{ gap: space.sm }}>
          <Overline>Credit history</Overline>
          {m.ledger.map((l, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.xs, borderBottomWidth: 1, borderBottomColor: c.line }}>
              <View>
                <Text style={type.bodyStrong}>{LEDGER_LABEL[l.reason]}</Text>
                <Text style={type.caption}>
                  {new Date(l.created_at).toLocaleDateString('en-JM', { day: 'numeric', month: 'short' })}
                  {l.note ? ` · ${l.note}` : ''}
                </Text>
              </View>
              <Text style={[type.bodyStrong, { color: l.delta > 0 ? c.accent : c.inkMuted }]}>
                {l.delta > 0 ? '+' : ''}
                {l.delta}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const LEDGER_LABEL: Record<MyMembership['ledger'][number]['reason'], string> = {
  grant: 'Monthly credits',
  rollover: 'Rolled over',
  redeem: 'Clean booked',
  expire: 'Expired',
  adjust: 'Adjustment',
  refund: 'Refunded',
};
