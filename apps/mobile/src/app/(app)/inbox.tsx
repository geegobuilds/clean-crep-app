import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, type Notification, type NotificationType } from '@clean-crep/shared';
import { Icon, type IconName } from '@/components/icon';
import { useNotifications } from '@/hooks/use-notifications';

const ICON_MAP: Record<NotificationType, { icon: IconName; bg: string; color: string }> = {
  ready: { icon: 'truck', bg: '#E8F1FB', color: '#0A1F44' },
  progress: { icon: 'clock', bg: '#D6EAF8', color: '#1A6FD4' },
  promo: { icon: 'star', bg: '#FEF9E7', color: '#B45309' },
  received: { icon: 'pkg', bg: '#F5F7FA', color: '#5A6A8A' },
  complete: { icon: 'check', bg: '#DCFCE7', color: '#16A34A' },
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
  const { notifications, markRead, markAllRead } = useNotifications();
  const unread = notifications.filter((n) => !n.read).length;
  const today = notifications.filter((n) => isToday(n.created_at));
  const earlier = notifications.filter((n) => !isToday(n.created_at));

  function handlePress(n: Notification) {
    markRead(n.id);
    if (n.order_id) router.push('/orders');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.offWhite }} edges={['top']}>
      <View style={{ backgroundColor: colors.white, padding: 20, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Text style={{ fontSize: 20, fontFamily: 'DMSans_500Medium', color: colors.navy }}>Inbox</Text>
          <Text style={{ fontSize: 13, color: colors.caption, marginTop: 3, fontFamily: 'DMSans_400Regular' }}>
            {unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'All caught up.'}
          </Text>
        </View>
        {unread > 0 && (
          <Pressable onPress={markAllRead}>
            <Text style={{ fontSize: 12, color: colors.blue, fontFamily: 'DMSans_500Medium' }}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        {notifications.length === 0 && (
          <Text style={{ fontSize: 13, color: colors.caption, fontFamily: 'DMSans_400Regular' }}>Nothing here yet.</Text>
        )}
        {today.length > 0 && <NotificationSection label="TODAY" items={today} onPress={handlePress} />}
        {earlier.length > 0 && <NotificationSection label="EARLIER" items={earlier} onPress={handlePress} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationSection({ label, items, onPress }: { label: string; items: Notification[]; onPress: (n: Notification) => void }) {
  return (
    <View>
      <Text style={{ fontSize: 10, fontFamily: 'DMSans_500Medium', color: colors.caption, letterSpacing: 2, marginBottom: 8 }}>{label}</Text>
      <View style={{ backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
        {items.map((n, i) => {
          const ico = ICON_MAP[n.type];
          return (
            <Pressable
              key={n.id}
              onPress={() => onPress(n)}
              style={{
                flexDirection: 'row',
                gap: 12,
                padding: 13,
                borderBottomWidth: i < items.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
                backgroundColor: !n.read ? 'rgba(26,111,212,0.04)' : colors.white,
              }}
            >
              {!n.read && <View style={{ position: 'absolute', top: 16, left: 6, width: 5, height: 5, borderRadius: 3, backgroundColor: colors.blue }} />}
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: ico.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={ico.icon} size={16} color={ico.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontFamily: n.read ? 'DMSans_400Regular' : 'DMSans_500Medium', color: colors.navy, flex: 1 }}>{n.title}</Text>
                  <Text style={{ fontSize: 10, color: colors.caption, marginLeft: 8, fontFamily: 'DMSans_400Regular' }}>{formatTime(n.created_at)}</Text>
                </View>
                <Text style={{ fontSize: 11, color: colors.caption, lineHeight: 16, marginTop: 3, fontFamily: 'DMSans_400Regular' }}>{n.body}</Text>
                {n.order_id && (
                  <Text style={{ fontSize: 10, color: colors.blue, fontFamily: 'DMSans_500Medium', marginTop: 4 }}>Order update</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
