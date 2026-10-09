import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { type Notification, type NotificationType } from '@clean-crep/shared';
import { Icon, type IconName } from '@/components/icon';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/lib/auth';
import { EmptyState, ErrorState, SignInPrompt, SkeletonList } from '@/components/states';
import { Overline, ScreenHeader } from '@/components/ui';
import { c, elevation, radius, space, type } from '@/theme';

const ICON_MAP: Record<NotificationType, { icon: IconName }> = {
  ready: { icon: 'truck' },
  progress: { icon: 'clock' },
  promo: { icon: 'star' },
  received: { icon: 'pkg' },
  complete: { icon: 'check' },
};

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isToday(d.toISOString())) return d.toLocaleTimeString('en-JM', { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString('en-JM', { month: 'short', day: 'numeric' });
}

export default function InboxScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { notifications, loading, error, reload, markRead, markAllRead } = useNotifications();
  const unread = notifications.filter((n) => !n.read).length;
  const today = notifications.filter((n) => isToday(n.created_at));
  const earlier = notifications.filter((n) => !isToday(n.created_at));

  function handlePress(n: Notification) {
    markRead(n.id);
    if (n.order_id) router.push('/orders');
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

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: space.xs, gap: space.lg, paddingBottom: 140 }}>
        {!session && (
          <SignInPrompt
            title="Sign in to see your updates"
            body="We'll let you know the moment your pair is cleaned and ready."
            where="inbox"
            onSignIn={() => router.push('/sign-in?next=/inbox')}
          />
        )}
        {session && loading && <SkeletonList count={3} />}
        {session && !loading && error && <ErrorState message={error} onRetry={reload} />}
        {session && !loading && !error && notifications.length === 0 && (
          <EmptyState
            title="Quiet in here."
            body="Updates on your pairs land here: received, being cleaned, ready for pickup. Book a clean to get started."
            actionLabel="Book a Clean"
            onAction={() => router.push('/book')}
          />
        )}
        {session && !loading && today.length > 0 && <NotificationSection label="TODAY" items={today} onPress={handlePress} />}
        {session && !loading && earlier.length > 0 && <NotificationSection label="EARLIER" items={earlier} onPress={handlePress} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationSection({ label, items, onPress }: { label: string; items: Notification[]; onPress: (n: Notification) => void }) {
  return (
    <View style={{ gap: space.sm }}>
      <Overline>{label}</Overline>
      <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg, overflow: 'hidden' }, elevation.card]}>
        {items.map((n, i) => {
          const ico = ICON_MAP[n.type];
          return (
            <Pressable
              key={n.id}
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
                <Icon name={ico.icon} size={17} color={n.read ? c.inkMuted : c.white} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.xs }}>
                  <Text style={[n.read ? type.body : type.bodyStrong, { flex: 1 }]}>{n.title}</Text>
                  {!n.read && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.accent }} />}
                  <Text style={[type.caption, { fontSize: 12 }]}>{formatTime(n.created_at)}</Text>
                </View>
                <Text style={[type.caption, { marginTop: 2 }]}>{n.body}</Text>
                {n.order_id && <Text style={[type.caption, { color: c.accent, marginTop: 4 }]}>Order update</Text>}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
