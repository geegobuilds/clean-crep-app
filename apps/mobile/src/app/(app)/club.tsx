import { useState } from 'react';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Image, Linking, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { CLUB_WHATSAPP, formatPrice, type MembershipPlan, type MyMembership } from '@clean-crep/shared';
import { Icon } from '@/components/icon';
import { Button, Card, Overline, ScreenHeader } from '@/components/ui';
import { ErrorState, SignInPrompt, SkeletonList } from '@/components/states';
import { useFeatureState } from '@/hooks/use-features';
import { useMembership } from '@/hooks/use-membership';
import { useServices } from '@/hooks/use-services';
import { useOrders } from '@/hooks/use-orders';
import { joinSaving, memberSaving } from '@/lib/club-saving';
import { useAuth } from '@/lib/auth';
import { tapLight } from '@/lib/haptics';
import { c, elevation, radius, space, type } from '@/theme';

const logo = require('../../../assets/brand/logo.png');

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
  const { orders } = useOrders();
  const { customer } = useAuth();
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
        subtitle="Monthly care credits for your sneakers, Clarks and caps. Unused cleans roll over."
        left={
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
            <Icon name="chevronL" size={20} color={c.navy} />
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
          <MemberCard m={membership} saving={memberSaving(membership, orders)} onBook={() => router.push('/book')} />
        )}
        {session && !loading && !error && membership?.status === 'pending' && !changing && (
          <PendingCard m={membership} onChange={() => setChanging(true)} />
        )}

        {session && !loading && !error && showPlans && (
          <View style={{ gap: space.md }}>
            {plans.length === 0 ? (
              <Card bordered>
                <Text style={type.body}>Plans are coming soon.</Text>
              </Card>
            ) : (
              <PlanPicker
                plans={plans}
                holder={customer?.name ?? null}
                cleanPrice={cleanPrice}
                suggestion={joinSaving(plans, orders)}
                current={membership?.plan.slug ?? null}
                joining={joining}
                onJoin={onJoin}
              />
            )}
            {joinError && <Text style={[type.body, { color: c.danger }]}>{joinError}</Text>}
            <Text style={[type.caption, { textAlign: 'center' }]}>No contracts. Pay monthly by transfer, Lynk or cash. Stop any time.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** The Club as a card in your wallet: bank-card proportions, the Home hero's navy. */
function WalletCard({ overline, big, bigLabel, name, meta, refCode }: { overline: string; big: string; bigLabel: string; name: string; meta: string; refCode?: string | null }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 600) - space.lg * 2;
  const h = Math.round(w / 1.586);
  return (
    <Animated.View testID="club-card" entering={FadeInUp.springify().damping(16)} style={[{ width: w, height: h, borderRadius: radius.lg + 4, overflow: 'hidden', padding: space.lg, justifyContent: 'space-between' }, elevation.raised]}>
      <Svg style={{ position: 'absolute', top: 0, left: 0 }} width={w} height={h}>
        <Defs>
          <LinearGradient id="wallet" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#061329" />
            <Stop offset="1" stopColor="#0E2A5C" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={w} height={h} fill="url(#wallet)" />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[type.overline, { color: c.onNavyMuted }]}>{overline}</Text>
        <Image source={logo} style={{ width: 28, height: 28, borderRadius: 14 }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.xs }}>
        <Text style={{ fontFamily: type.display.fontFamily, fontSize: 64, lineHeight: 68, color: c.white, fontVariant: ['tabular-nums'] }}>{big}</Text>
        <Text style={[type.headline, { color: c.white }]}>{bigLabel}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={[type.bodyStrong, { color: c.white }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[type.caption, { color: c.onNavyMuted }]}>{meta}</Text>
        </View>
        {refCode ? <Text style={[type.caption, { color: c.onNavyMuted, letterSpacing: 2 }]}>{refCode}</Text> : null}
      </View>
    </Animated.View>
  );
}

function PlanPicker({
  plans,
  holder,
  cleanPrice,
  suggestion,
  current,
  joining,
  onJoin,
}: {
  plans: MembershipPlan[];
  holder: string | null;
  cleanPrice: number | null;
  suggestion: { plan: MembershipPlan; line: string } | null;
  current: string | null;
  joining: string | null;
  onJoin: (slug: string) => void;
}) {
  // Start on the plan their own bookings point to, else the one most people pick.
  const [slug, setSlug] = useState(() => suggestion?.plan.slug ?? plans.find((p) => p.slug === 'sneakerhead')?.slug ?? plans[0].slug);
  const plan = plans.find((p) => p.slug === slug) ?? plans[0];
  const worth = cleanPrice ? plan.credits_per_month * cleanPrice : null;
  const busy = joining === plan.slug;
  return (
    <View style={{ gap: space.md }}>
      <WalletCard
        overline="Clean Crep Club"
        big={String(plan.credits_per_month)}
        bigLabel={`clean${plan.credits_per_month === 1 ? '' : 's'} a month`}
        name={holder ?? plan.name}
        meta={`${plan.name} · ${formatPrice(plan.price_cents)} a month`}
      />
      <View style={{ flexDirection: 'row', gap: space.xs }} accessibilityRole="radiogroup">
        {plans.map((p) => {
          const on = p.slug === plan.slug;
          return (
            <Pressable
              key={p.id}
              testID="club-plan"
              accessibilityRole="radio"
              aria-checked={on}
              onPress={() => {
                tapLight();
                setSlug(p.slug);
              }}
              style={[{ flex: 1, alignItems: 'center', paddingVertical: space.sm, borderRadius: radius.pill, backgroundColor: on ? c.navy : c.surface }, on ? null : elevation.card]}
            >
              <Text style={[type.bodyStrong, { fontSize: 14, color: on ? c.white : c.ink }]}>{p.name}</Text>
              <Text style={[type.caption, { fontSize: 12, color: on ? c.onNavyMuted : c.inkMuted }]}>{formatPrice(p.price_cents)}</Text>
            </Pressable>
          );
        })}
      </View>
      {suggestion ? (
        <Text style={type.bodyStrong}>{suggestion.line}</Text>
      ) : worth !== null && worth > plan.price_cents ? (
        <Text style={type.bodyStrong}>
          {plan.credits_per_month} cleans worth {formatPrice(worth)}. You save {formatPrice(worth - plan.price_cents)}.
        </Text>
      ) : (
        <Text style={type.bodyStrong}>Unused cleans roll over.</Text>
      )}
      <View style={{ gap: space.xs }}>
        {plan.perks.map((perk) => (
          <View key={perk} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
            <Icon name="check" size={18} color={c.navy} />
            <Text style={[type.body, { flex: 1 }]}>{perk}</Text>
          </View>
        ))}
      </View>
      <Button label={busy ? 'Joining…' : current === plan.slug ? 'Selected' : `Join ${plan.name}`} disabled={busy || current === plan.slug} onPress={() => onJoin(plan.slug)} />
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

function MemberCard({ m, saving, onBook }: { m: MyMembership; saving: string; onBook: () => void }) {
  const [now] = useState(() => Date.now());
  const paused = m.status === 'paused';
  const renewSoon = !!m.current_period_end && new Date(`${m.current_period_end}T12:00:00`).getTime() - now < 5 * 864e5;
  const renewMsg = `Hi Clean Crep! I'd like to renew my ${m.plan.name} (${formatPrice(m.plan.price_cents)}). Reference ${m.payment_ref}.`;
  return (
    <View style={{ gap: space.lg }}>
      <View testID="club-member" style={{ gap: space.md }}>
        <WalletCard
          overline="Clean Crep Club"
          big={String(m.balance)}
          bigLabel={`care credit${m.balance === 1 ? '' : 's'}`}
          name={m.plan.name}
          meta={paused ? 'Paused · renew to use your credits' : `${m.plan.credits_per_month} new every month · renews ${day(m.current_period_end)}`}
          refCode={m.payment_ref}
        />
        {!paused && <Text style={type.bodyStrong}>{saving}</Text>}
        {!paused && m.balance > 0 && <Button label="Book with a credit" onPress={onBook} />}
        {(paused || renewSoon) && <Button variant={paused ? 'primary' : 'secondary'} label="Renew on WhatsApp" icon={<Icon name="wa" size={18} color={paused ? c.white : c.navy} />} onPress={() => whatsapp(renewMsg)} />}
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
              <Text style={[type.bodyStrong, { color: l.delta > 0 ? c.navy : c.inkMuted }]}>
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
