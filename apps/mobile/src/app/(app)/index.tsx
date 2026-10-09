import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { formatPrice, TRACKER_STEPS, stepFromStatus, type OrderStatus } from '@clean-crep/shared';
import { Icon, type IconName } from '@/components/icon';
import { readyBy } from '@/components/order-ticket';
import { useAuth } from '@/lib/auth';
import { success, tapLight } from '@/lib/haptics';
import { useServices } from '@/hooks/use-services';
import { useOrders } from '@/hooks/use-orders';
import { useFeatures } from '@/hooks/use-features';
import { ErrorState, SignInPrompt, Skeleton } from '@/components/states';
import { ReviewAsk } from '@/components/review-ask';
import { CreppieChat } from '@/components/creppie-chat';
import { c, elevation, radius, space, spring, type } from '@/theme';

// Home, built on three rules (DESIGN.md §8):
//  1. Three planes: one huge word at the back, Creppie with a clean shoe in the
//     middle, the Book button on top, overlapping the edge so the screen has depth.
//  2. One signal colour: blue only ever means "tap this". Prices and labels are ink.
//  3. No middle sizes: the hero word is huge, everything else is small.

const logo = require('../../../assets/brand/logo.png');
const creppieShoe = require('../../../assets/creppie/success.png');
const WHATSAPP_URL = 'https://wa.me/18765072163';

const HERO_WORD: Partial<Record<OrderStatus, string>> = {
  received: 'RECEIVED',
  in_progress: 'CLEANING',
  ready_for_pickup: 'READY',
  pending_payment: 'READY',
};

function formatEta(d: Date): string {
  if (d.toDateString() === new Date().toDateString()) return 'Today';
  return d.toLocaleDateString('en-JM', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { session, customer } = useAuth();
  const features = useFeatures();
  const { services, loading: servicesLoading, error: servicesError, reload: reloadServices } = useServices();
  // Home is always mounted, so it owns the "your pair is ready" success haptic.
  const { orders, loading: ordersLoading, error: ordersError, reload: reloadOrders } = useOrders({ onReady: () => success() });
  const activeOrders = orders.filter((o) => o.status !== 'completed');
  const lead = activeOrders[0] ?? null;
  const lastCompleted = orders.find((o) => o.status === 'completed') ?? null;
  const firstName = customer?.name?.split(' ')[0];

  const word = (lead && HERO_WORD[lead.status]) || 'FRESH';
  // One line, edge to edge: size the word to the screen (Archivo 800 is ~0.7em per letter).
  const wordSize = Math.min(132, Math.floor((width - space.lg * 2) / (word.length * 0.7)));

  const [chatOpen, setChatOpen] = useState(false);
  // Book and Orders live in the tab bar; these are the shortcuts that don't.
  const actions: { icon: IconName; label: string; onPress: () => void }[] = [
    ...(features.has('vault') ? [{ icon: 'vault' as IconName, label: 'Vault', onPress: () => router.push('/vault') }] : []),
    ...(features.has('membership') ? [{ icon: 'star' as IconName, label: 'Club', onPress: () => router.push('/club' as Href) }] : []),
    { icon: 'help', label: 'Creppie', onPress: () => setChatOpen(true) },
    { icon: 'wa', label: 'WhatsApp', onPress: () => Linking.openURL(WHATSAPP_URL) },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={[]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* ── Hero: three planes ─────────────────────────────────────── */}
        <View style={{ backgroundColor: c.navy, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, paddingTop: 56, height: 470, overflow: 'visible' }}>
          {/* Small stuff only up here */}
          <View style={{ paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Image source={logo} style={{ width: 28, height: 28, borderRadius: 14 }} />
            <Text style={[type.caption, { color: c.onNavyMuted, flex: 1 }]}>{firstName ? `Hi, ${firstName}` : 'Clean Crep Jamaica'}</Text>
            <Pressable onPress={() => router.push('/inbox')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Inbox">
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.onNavyLine, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="bell" size={17} color={c.white} />
              </View>
            </Pressable>
          </View>
          <Text style={[type.overline, { color: c.onNavyMuted, paddingHorizontal: space.lg, marginTop: space.lg }]}>
            {lead ? `${lead.item_name.replace(/^\s*\d+\s*x\s*/i, '')} · ${lead.order_number}` : 'Sneakers · Clarks · Caps'}
          </Text>

          {/* Plane 1 (back): the one huge thing */}
          <Text
            testID="hero-word"
            numberOfLines={1}
            style={{
              fontFamily: type.display.fontFamily,
              fontSize: wordSize,
              lineHeight: wordSize * 1.02,
              letterSpacing: -wordSize * 0.04,
              color: c.white,
              paddingHorizontal: space.lg - 4,
              marginTop: space.xxs,
            }}
          >
            {word}
          </Text>

          {/* Plane 2 (middle): the subject, overlapping the word and spilling past the edge */}
          <Animated.View entering={FadeInDown.springify().damping(16)} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 120 + wordSize * 0.45, alignItems: 'center' }}>
            <Image source={creppieShoe} style={{ width: 300, height: 300 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          </Animated.View>
        </View>

        {/* Plane 3 (top): the action, sitting on the hero's edge */}
        <View style={{ paddingHorizontal: space.lg, marginTop: -30, gap: space.lg }}>
          <Pressable
            testID="hero-book"
            onPress={() => {
              tapLight();
              router.push('/book');
            }}
            accessibilityRole="button"
            style={[
              {
                height: 60,
                borderRadius: radius.pill,
                backgroundColor: c.accent,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingLeft: space.lg,
                paddingRight: 6,
              },
              elevation.raised,
            ]}
          >
            <Text style={[type.button, { color: c.white }]}>{lead ? 'Book another pair' : 'Book a clean'}</Text>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.white, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="arrowR" size={20} color={c.accent} strokeWidth={2} />
            </View>
          </Pressable>

          {/* Active order: small, quiet, one glance */}
          {session && !ordersLoading && lead && (
            <Pressable testID="home-order" onPress={() => router.push('/orders')} style={[{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.md, gap: space.sm }, elevation.card]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={type.overline}>Your order</Text>
                <Text style={type.caption}>
                  Ready {formatEta(readyBy(lead))}
                  {activeOrders.length > 1 ? ` · +${activeOrders.length - 1} more` : ''}
                </Text>
              </View>
              <Steps step={stepFromStatus(lead.status)} />
            </Pressable>
          )}
          {session && ordersError && !ordersLoading && <ErrorState message={ordersError} onRetry={reloadOrders} />}
          {!session && (
            <SignInPrompt title="Track your cleans here" body="Sign in to see live updates on your pairs." where="home" onSignIn={() => router.push('/sign-in?next=/')} />
          )}

          {/* Quick actions: small circles */}
          <View style={{ flexDirection: 'row', justifyContent: actions.length < 4 ? 'space-around' : 'space-between' }}>
            {actions.map((a) => (
              <Pressable
                key={a.label}
                onPress={a.onPress}
                accessibilityRole="button"
                accessibilityLabel={a.label}
                style={{ alignItems: 'center', gap: 6, width: 72 }}
              >
                <View style={[{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }, elevation.card]}>
                  <Icon name={a.icon} size={22} color={c.navy} />
                </View>
                <Text style={[type.caption, { color: c.ink }]}>{a.label}</Text>
              </Pressable>
            ))}
          </View>

          {session && !ordersLoading && <ReviewAsk itemName={lastCompleted?.item_name ?? null} />}

          {/* Menu: a quiet list, prices in ink (blue is only for taps) */}
          <View>
            <Text style={[type.overline, { marginBottom: space.xs }]}>Menu</Text>
            {servicesError && !servicesLoading && <ErrorState message={servicesError} onRetry={reloadServices} />}
            <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg, overflow: 'hidden' }, elevation.card]}>
              {servicesLoading &&
                services.length === 0 &&
                [0, 1, 2].map((i) => (
                  <View key={i} style={{ padding: space.md }}>
                    <Skeleton width="60%" height={14} />
                  </View>
                ))}
              {services.map((s, i) => (
                <Pressable
                  key={s.id}
                  onPress={() => router.push('/book')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    paddingHorizontal: space.md,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: c.line,
                    gap: space.sm,
                  }}
                >
                  <Text style={[type.bodyStrong, { flex: 1 }]} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <Text style={[type.body, { color: c.inkMuted, fontVariant: ['tabular-nums'] }]}>{formatPrice(s.price_cents)}</Text>
                  <Icon name="chevronR" size={16} color={c.inkMuted} />
                </Pressable>
              ))}
            </View>
          </View>

          <Text style={[type.caption, { textAlign: 'center' }]}>Shop 19, Pristine Plaza, Half Way Tree</Text>
        </View>
      </ScrollView>
      {chatOpen && <CreppieChat onClose={() => setChatOpen(false)} />}
    </SafeAreaView>
  );
}

/** Four dots on a line: Received → Cleaning → Ready → Collected. Springs to the current step. */
function Steps({ step }: { step: number }) {
  const p = useSharedValue(0);
  const total = TRACKER_STEPS.length;
  useEffect(() => {
    p.value = withDelay(120, withSpring(Math.max(0, step - 1) / (total - 1), spring));
  }, [step, total, p]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.round(p.value * 100)}%` }));
  return (
    <View>
      <View style={{ height: 4, marginHorizontal: 6, marginTop: 4, backgroundColor: c.line, borderRadius: 2 }}>
        <Animated.View style={[{ height: 4, backgroundColor: c.navy, borderRadius: 2 }, fill]} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -8 }}>
        {TRACKER_STEPS.map((s, i) => {
          const done = i < step;
          return (
            <View key={s} style={{ alignItems: i === 0 ? 'flex-start' : i === total - 1 ? 'flex-end' : 'center', width: 70 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: done ? c.navy : c.surface, borderWidth: 2, borderColor: done ? c.navy : c.line }} />
              <Text style={[type.caption, { fontSize: 11, marginTop: 4, color: done ? c.ink : c.inkMuted }]} numberOfLines={1}>
                {s}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
