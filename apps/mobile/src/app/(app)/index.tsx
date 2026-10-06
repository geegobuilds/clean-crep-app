import { useEffect } from 'react';
import { Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { formatPrice, TRACKER_STEPS, stepFromStatus } from '@clean-crep/shared';
import { Icon, type IconName } from '@/components/icon';
import { StatusTag } from '@/components/status-tag';
import { readyBy } from '@/components/order-ticket';
import { Button, Overline } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { success } from '@/lib/haptics';
import { useServices } from '@/hooks/use-services';
import { useOrders } from '@/hooks/use-orders';
import { EmptyState, ErrorState, SignInPrompt, Skeleton, SkeletonCard } from '@/components/states';
import { ReviewAsk } from '@/components/review-ask';
import { CreppieButton } from '@/components/creppie-chat';
import { c, elevation, radius, space, spring, type } from '@/theme';

const logo = require('../../../assets/brand/logo.png');
const WHATSAPP_URL = 'https://wa.me/18765072163';
const SERVICE_CARD_WIDTH = 148;

function formatEta(d: Date): string {
  if (d.toDateString() === new Date().toDateString()) return 'Today';
  return d.toLocaleDateString('en-JM', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function HomeScreen() {
  const router = useRouter();
  const { session, customer } = useAuth();
  const { services, loading: servicesLoading, error: servicesError, reload: reloadServices } = useServices();
  // Home is always mounted, so it owns the "your pair is ready" success haptic.
  const { orders, loading: ordersLoading, error: ordersError, reload: reloadOrders } = useOrders({ onReady: () => success() });
  const activeOrders = orders.filter((o) => o.status !== 'completed').slice(0, 3);
  const lastCompleted = orders.find((o) => o.status === 'completed') ?? null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 104 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Image source={logo} style={{ width: 40, height: 40, borderRadius: 20 }} />
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={type.overline}>{session ? 'WELCOME BACK' : 'WELCOME'}</Text>
            <Text style={type.headline}>Hi, {customer?.name ?? 'there'} 👋</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: space.lg, gap: space.xl }}>
          {/* Hero */}
          <View style={[{ backgroundColor: c.navy, borderRadius: radius.lg, padding: space.lg, overflow: 'hidden' }, elevation.raised]}>
            <View style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(26,111,212,0.18)' }} />
            <Text style={[type.overline, { color: c.onNavyMuted, marginBottom: space.sm }]}>CLEAN CREP JAMAICA</Text>
            <Text style={[type.display, { color: c.white, marginBottom: space.sm }]}>Your Creps{'\n'}Deserve Better.</Text>
            <Text style={[type.body, { color: c.onNavyMuted, marginBottom: space.lg }]}>Drop in at Half Way Tree or let CrepRun collect.</Text>
            <Button label="Book a Clean" onPress={() => router.push('/book')} style={{ alignSelf: 'flex-start' }} />
          </View>

          {/* Services row */}
          <View>
            <Overline style={{ marginBottom: space.sm }}>SERVICES</Overline>
            {servicesError && !servicesLoading && <ErrorState message={servicesError} onRetry={reloadServices} />}
            {/* Horizontal swipe row with fixed-width cards: the catalog grew from 3 to 6. */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -space.lg }}
              contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.xxs }}
            >
              {servicesLoading &&
                services.length === 0 &&
                [0, 1, 2].map((i) => (
                  <View key={i} style={[{ width: SERVICE_CARD_WIDTH, backgroundColor: c.surface, borderRadius: radius.lg, padding: space.md, gap: space.xs }, elevation.card]}>
                    <Skeleton width={40} height={40} style={{ borderRadius: radius.md }} />
                    <Skeleton width="80%" height={15} />
                    <Skeleton width="50%" height={20} />
                  </View>
                ))}
              {services.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => router.push('/book')}
                  style={[{ width: SERVICE_CARD_WIDTH, backgroundColor: c.surface, borderRadius: radius.lg, padding: space.md, gap: space.xs }, elevation.card]}
                >
                  <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: c.ice, alignItems: 'center', justifyContent: 'center', marginBottom: space.xxs }}>
                    <Icon name={s.icon as IconName} size={18} color={c.accent} />
                  </View>
                  <Text style={type.bodyStrong} numberOfLines={2}>
                    {s.name}
                  </Text>
                  <Text style={type.price}>{formatPrice(s.price_cents)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {session && !ordersLoading && <ReviewAsk itemName={lastCompleted?.item_name ?? null} />}

          {/* Active orders */}
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm }}>
              <Overline>ACTIVE ORDERS</Overline>
              <Pressable onPress={() => router.push('/orders')} hitSlop={12}>
                <Text style={[type.bodyStrong, { color: c.accent }]}>See All</Text>
              </Pressable>
            </View>
            <View style={{ gap: space.sm }}>
              {!session && (
                <SignInPrompt
                  title="Track your cleans here"
                  body="Sign in to see live updates on your pairs."
                  where="home"
                  onSignIn={() => router.push('/sign-in?next=/')}
                />
              )}
              {session && ordersLoading && <SkeletonCard />}
              {session && !ordersLoading && ordersError && <ErrorState message={ordersError} onRetry={reloadOrders} />}
              {session && !ordersLoading && !ordersError && activeOrders.length === 0 && (
                <EmptyState
                  title="No active orders right now"
                  body="Drop your next pair in and track it here."
                  actionLabel="Book a Clean"
                  onAction={() => router.push('/book')}
                />
              )}
              {session &&
                !ordersLoading &&
                activeOrders.map((o) => (
                  <Pressable
                    key={o.id}
                    onPress={() => router.push('/orders')}
                    style={[{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.md }, elevation.card]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, marginBottom: space.sm }}>
                      <View style={{ flex: 1 }}>
                        <Text style={type.headline} numberOfLines={1}>
                          {o.item_name}
                        </Text>
                        <Text style={type.caption}>
                          {o.order_number} · {o.service?.name ?? '—'}
                        </Text>
                      </View>
                      <StatusTag status={o.status} />
                    </View>
                    <ProgressBar pct={stepFromStatus(o.status) / TRACKER_STEPS.length} />
                    <Text style={[type.caption, { marginTop: space.xs }]}>
                      Ready by <Text style={{ color: c.navy }}>{formatEta(readyBy(o))}</Text>
                    </Text>
                  </Pressable>
                ))}
            </View>
          </View>

          {/* WhatsApp banner */}
          <View style={{ backgroundColor: c.navy, borderRadius: radius.lg, padding: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <Text style={[type.headline, { color: c.white }]}>Questions? Link us.</Text>
              <Text style={[type.caption, { color: c.onNavyMuted }]}>Shop 19, Pristine Plaza, HWT</Text>
            </View>
            <Button compact variant="onDark" label="WhatsApp" icon={<Icon name="wa" size={16} color={c.white} />} onPress={() => Linking.openURL(WHATSAPP_URL)} />
          </View>
        </View>
      </ScrollView>
      <CreppieButton />
    </SafeAreaView>
  );
}

/** Springs from empty to the order's progress when it appears or changes. */
function ProgressBar({ pct }: { pct: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(120, withSpring(pct, spring));
  }, [pct, p]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.round(p.value * 100)}%` }));
  return (
    <View style={{ height: 6, backgroundColor: c.ice, borderRadius: radius.pill, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', backgroundColor: c.accent, borderRadius: radius.pill }, fill]} />
    </View>
  );
}
