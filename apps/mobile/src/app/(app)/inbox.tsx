import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { type Notification, type NotificationType } from '@clean-crep/shared';
import { Icon, type IconName } from '@/components/icon';
import { useNotifications } from '@/hooks/use-notifications';
import { useOrders } from '@/hooks/use-orders';
import { useFeatures } from '@/hooks/use-features';
import { useAuth } from '@/lib/auth';
import { EmptyState, ErrorState, SignInPrompt, SkeletonList } from '@/components/states';
import { Overline, ScreenHeader } from '@/components/ui';
import { c, elevation, radius, space, type } from '@/theme';
import { usePullRefresh } from '@/hooks/use-pull-refresh';

const ICON_MAP: Record<NotificationType, IconName> = {
  ready: 'truck',
  progress: 'clock',
  promo: 'star',
  received: 'pkg',
  complete: 'check',
};

const DIRECTIONS_URL = 'https://www.google.com/maps/search/?api=1&query=Clean+Crep+Jamaica+Pristine+Plaza+Half+Way+Tree';

type Action = { label: string; run: (router: ReturnType<typeof useRouter>) => void };

/**
 * The nudges share a type with other messages, so the title says which one it is.
 * `pair`: the Vault item a Ready/Completed order cleaned (Vault + Passport on), which
 * its action opens (before/after, care history, share) instead of Orders (0031).
 */
function kindOf(n: Notification, pair: string | null = null): { icon: IconName; action?: Action } {
  if (n.title === 'Due for a clean') return { icon: 'vault', action: { label: 'Book again', run: (r) => r.push('/book') } };
  if (n.title === 'Use your care credits') return { icon: 'coins', action: { label: 'Book a clean', run: (r) => r.push('/book') } };
  if (n.title === 'Still waiting for you') return { icon: 'pin', action: { label: 'Get directions', run: () => Linking.openURL(DIRECTIONS_URL) } };
  const icon = ICON_MAP[n.type] ?? 'bell';
  if (pair && (n.type === 'ready' || n.type === 'complete')) {
    const label = n.body.includes('before & after') ? 'See before & after' : 'View in Vault';
    return { icon, action: { label, run: (r) => r.push(`/vault?pair=${pair}`) } };
  }
  return n.order_id ? { icon, action: { label: 'Track order', run: (r) => r.push('/orders') } } : { icon };
}

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

/** "Now", "12m", "3h" today; then "Yesterday", the weekday this week, else "12 Oct". */
function formatTime(iso: string): string {
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (isToday(iso)) {
    if (mins < 1) return 'Now';
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h`;
  }
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  if (mins < 6 * 24 * 60) return d.toLocaleDateString('en-JM', { weekday: 'short' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function InboxScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { notifications, loading, error, reload, markRead, markAllRead } = useNotifications();
  const { orders, loading: ordersLoading } = useOrders();
  const features = useFeatures();
  const pairOf = (n: Notification): string | null =>
    (features.has('vault') && features.has('passport') && n.order_id && orders.find((o) => o.id === n.order_id)?.pair_id) || null;
  const refresh = usePullRefresh(reload);
  const unread = notifications.filter((n) => !n.read).length;
  const today = notifications.filter((n) => isToday(n.created_at));
  const earlier = notifications.filter((n) => !isToday(n.created_at));

  function handlePress(n: Notification, action?: Action) {
    markRead(n.id);
    if (action) action.run(router);
    else if (n.order_id) (kindOf(n, pairOf(n)).action ?? { run: (r: typeof router) => r.push('/orders') }).run(router);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScreenHeader
        title="Inbox"
        subtitle={!session ? 'Order updates land here.' : unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'All caught up.'}
        right={
          unread > 0 ? (
            <Pressable onPress={markAllRead} accessibilityRole="button" hitSlop={8} style={{ backgroundColor: c.surface, borderRadius: radius.pill, paddingVertical: space.xs, paddingHorizontal: space.md, ...elevation.card }}>
              <Text style={[type.bodyStrong, { color: c.accent, fontSize: 14 }]}>Mark all read</Text>
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView refreshControl={session ? refresh : undefined} contentContainerStyle={{ padding: space.lg, paddingTop: space.xs, gap: space.lg, paddingBottom: 140 }}>
        {!session && (
          <SignInPrompt
            title="Sign in to see your updates"
            body="We'll let you know the moment your order is clean and ready."
            where="inbox"
            onSignIn={() => router.push('/sign-in?next=/inbox')}
          />
        )}
        {session && loading && <SkeletonList count={3} />}
        {session && !loading && error && <ErrorState message={error} onRetry={reload} />}
        {session && !loading && !error && notifications.length === 0 && (
          <EmptyState
            title="Quiet in here."
            body="Updates on your orders land here: received, being cleaned, ready. Book a clean to get started."
            actionLabel="Book a Clean"
            onAction={() => router.push('/book')}
          />
        )}
        {session && !loading && today.length > 0 && <NotificationSection label="TODAY" items={today} pairOf={pairOf} ordersLoading={ordersLoading} onPress={handlePress} />}
        {session && !loading && earlier.length > 0 && <NotificationSection label="EARLIER" items={earlier} pairOf={pairOf} ordersLoading={ordersLoading} onPress={handlePress} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationSection({ label, items, pairOf, ordersLoading, onPress }: { label: string; items: Notification[]; pairOf: (n: Notification) => string | null; ordersLoading: boolean; onPress: (n: Notification, action?: Action) => void }) {
  return (
    <View style={{ gap: space.sm }}>
      <Overline>{label}</Overline>
      <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg, overflow: 'hidden' }, elevation.card]}>
        {items.map((n, i) => {
          // Order updates wait for orders to load, so the chip doesn't flip from Track order to the Vault.
          const kind = n.order_id && ordersLoading ? { icon: kindOf(n).icon } : kindOf(n, pairOf(n));
          return (
            <Animated.View key={n.id} entering={FadeInDown.delay(i * 40).springify().damping(18)}>
              <Pressable
                testID="inbox-row"
                onPress={() => onPress(n)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  gap: space.sm,
                  padding: space.md,
                  borderBottomWidth: i < items.length - 1 ? 1 : 0,
                  borderBottomColor: c.line,
                  backgroundColor: pressed ? c.bg : c.surface,
                })}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: n.read ? c.bg : c.navy, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={kind.icon} size={17} color={n.read ? c.inkMuted : c.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.xs }}>
                    <Text style={[n.read ? type.body : type.bodyStrong, { flex: 1 }]}>{n.title}</Text>
                    {!n.read && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.navy }} />}
                    <Text style={[type.caption, { fontSize: 12 }]}>{formatTime(n.created_at)}</Text>
                  </View>
                  <Text style={[type.caption, { marginTop: 2 }]}>{n.body}</Text>
                  {kind.action && (
                    <Pressable
                      testID="inbox-action"
                      onPress={() => onPress(n, kind.action)}
                      accessibilityRole="button"
                      hitSlop={8}
                      style={{ alignSelf: 'flex-start', marginTop: space.sm, borderRadius: radius.pill, backgroundColor: c.ice, paddingVertical: 6, paddingHorizontal: space.md }}
                    >
                      <Text style={[type.bodyStrong, { fontSize: 13, lineHeight: 18, color: c.accent }]}>{kind.action.label}</Text>
                    </Pressable>
                  )}
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}
