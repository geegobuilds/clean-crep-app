import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { formatPrice } from '@clean-crep/shared';
import { Icon, type IconName } from '@/components/icon';
import { StatusTag } from '@/components/status-tag';
import { useAuth } from '@/lib/auth';
import { useOrders } from '@/hooks/use-orders';
import { useFeatures } from '@/hooks/use-features';
import { enablePush, pushStatus } from '@/lib/push';
import { openPrivacy, openTerms } from '@/lib/legal';
import { EmptyState, ErrorState, SignInPrompt, Skeleton, SkeletonCard } from '@/components/states';
import { Overline, ScreenHeader } from '@/components/ui';
import { c, elevation, radius, space, type } from '@/theme';
import { usePullRefresh } from '@/hooks/use-pull-refresh';

const LOYALTY_GOAL = 500;

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

/** "Oct 2025", or null if the date is missing or unreadable. */
function memberSince(dateIso: string | null | undefined): string | null {
  const d = dateIso ? new Date(dateIso) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-JM', { month: 'short', year: 'numeric' });
}

async function openNotificationSettings() {
  const status = await pushStatus();
  if (status === 'unsupported') {
    Alert.alert('Order updates', 'Push notifications work in the Clean Crep app on your phone.');
  } else if (status === 'granted') {
    Alert.alert('Order updates are on', "We'll ping you when your pair is received, being cleaned, and ready for pickup.");
  } else if (status === 'denied') {
    // The app can't re-ask once denied; send them to the OS settings.
    Linking.openSettings();
  } else {
    await enablePush();
  }
}

export default function ProfileScreen() {
  const router = useRouter();
  const features = useFeatures();
  const { session, customer, signOut } = useAuth();
  const { orders, loading, error, reload } = useOrders();
  const refresh = usePullRefresh(reload);
  const pastOrders = orders.filter((o) => o.status === 'completed');
  const points = customer?.loyalty_points ?? 0;
  const pctToGoal = Math.min(100, Math.round((points / LOYALTY_GOAL) * 100));
  const since = memberSince(customer?.member_since);

  if (!session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
        <ScreenHeader title="Profile" subtitle="Your cleans, points and rewards." />
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: space.xs }}>
          <SignInPrompt
            title="Sign in to see your profile"
            body={`Every clean earns loyalty points. Hit ${LOYALTY_GOAL} and your next clean is free.`}
            where="profile"
            onSignIn={() => router.push('/sign-in?next=/profile')}
          />
          <Legal />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const firstName = customer?.name.trim().split(/\s+/)[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScrollView refreshControl={refresh} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Big name, avatar on the right. */}
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.md, flexDirection: 'row', alignItems: 'flex-end', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Text style={type.overline}>{since ? `Member since ${since}` : 'Clean Crep'}</Text>
            {customer ? (
              <>
                <Text style={[type.hero, { marginTop: space.xxs }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} accessibilityRole="header">
                  {firstName}
                </Text>
                <Text style={[type.body, { color: c.inkMuted }]} numberOfLines={1}>
                  {customer.email ?? ''}
                </Text>
              </>
            ) : (
              <View style={{ gap: 6, marginTop: space.xs }}>
                <Skeleton width={140} height={36} />
                <Skeleton width={180} height={14} />
              </View>
            )}
          </View>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.navy, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[type.headline, { color: c.white }]}>{initials(customer?.name ?? '?')}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: space.lg, gap: space.lg }}>
          {/* Loyalty, as a wallet card. */}
          <View testID="loyalty-card" style={[{ backgroundColor: c.navy, borderRadius: radius.lg + 4, padding: space.lg, gap: space.sm, overflow: 'hidden' }, elevation.raised]}>
            <View style={{ position: 'absolute', right: -60, top: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(26,111,212,0.35)' }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[type.overline, { color: c.onNavyMuted }]}>Loyalty points</Text>
              <Icon name="star" size={18} color={c.onNavyMuted} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={[type.hero, { color: c.white, fontSize: 56, lineHeight: 58, fontVariant: ['tabular-nums'] }]}>{points}</Text>
              <Text style={[type.body, { color: c.onNavyMuted }]}>/ {LOYALTY_GOAL} pts</Text>
            </View>
            <View style={{ height: 6, backgroundColor: c.onNavyLine, borderRadius: radius.pill, overflow: 'hidden' }}>
              <View style={{ width: `${pctToGoal}%`, height: '100%', backgroundColor: c.white, borderRadius: radius.pill }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[type.caption, { color: c.onNavyMuted }]}>
                {Math.max(0, LOYALTY_GOAL - points)} points to a <Text style={{ color: c.white }}>free clean</Text>.
              </Text>
              <Text style={[type.caption, { color: c.onNavyMuted, fontVariant: ['tabular-nums'] }]}>
                {pastOrders.length} clean{pastOrders.length === 1 ? '' : 's'}
              </Text>
            </View>
          </View>

          {/* Past orders */}
          <View style={{ gap: space.sm }}>
            <Overline>PAST ORDERS</Overline>
            {loading && <SkeletonCard />}
            {!loading && error && <ErrorState message={error} onRetry={reload} />}
            {!loading && !error && pastOrders.length === 0 && (
              <EmptyState
                title="No completed cleans yet"
                body="Finished orders and the points they earned show up here."
                actionLabel="Book a Clean"
                onAction={() => router.push('/book')}
              />
            )}
            {!loading && !error && pastOrders.length > 0 && (
              <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg, overflow: 'hidden' }, elevation.card]}>
                {pastOrders.map((o, i) => (
                  <View
                    key={o.id}
                    style={{
                      padding: space.md,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: space.sm,
                      borderBottomWidth: i < pastOrders.length - 1 ? 1 : 0,
                      borderBottomColor: c.line,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={type.bodyStrong} numberOfLines={1}>
                        {o.item_name}
                      </Text>
                      <Text style={type.caption}>
                        {o.service.name} · {new Date(o.scheduled_date).toLocaleDateString('en-JM', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={[type.bodyStrong, { fontVariant: ['tabular-nums'] }]}>{formatPrice(o.price_cents)}</Text>
                      <StatusTag status="completed" />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Settings */}
          <View style={{ gap: space.sm }}>
            <Overline>SETTINGS</Overline>
            <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg, overflow: 'hidden' }, elevation.card]}>
              {(
                [
                  ...(features.has('membership') ? [{ icon: 'star', label: 'Clean Crep Club', onPress: () => router.push('/club' as Href) }] : []),
                  { icon: 'bell', label: 'Notifications', onPress: openNotificationSettings },
                  { icon: 'help', label: 'Help & Support' },
                  { icon: 'check', label: 'Privacy Policy', onPress: openPrivacy },
                  { icon: 'book', label: 'Terms of Service', onPress: openTerms },
                  { icon: 'settings', label: 'Account Settings' },
                ] as { icon: IconName; label: string; onPress?: () => void }[]
              ).map((item, i, arr) => (
                <Pressable
                  key={item.label}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  onPress={item.onPress}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.sm,
                    paddingVertical: space.sm + 2,
                    paddingHorizontal: space.md,
                    backgroundColor: pressed ? c.bg : c.surface,
                    borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                    borderBottomColor: c.line,
                  })}
                >
                  <View style={{ width: 34, height: 34, borderRadius: radius.sm + 2, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={item.icon} size={17} color={c.navy} />
                  </View>
                  <Text style={[type.body, { flex: 1 }]}>{item.label}</Text>
                  <Icon name="chevronR" size={16} color={c.inkMuted} />
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign Out"
              onPress={signOut}
              style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, paddingVertical: space.md, borderRadius: radius.lg, backgroundColor: pressed ? c.surface : 'transparent' }]}
            >
              <Icon name="logout" size={17} color={c.danger} />
              <Text style={[type.bodyStrong, { color: c.danger }]}>Sign Out</Text>
            </Pressable>
          </View>
          <Legal />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Legal() {
  return (
    <Text style={[type.caption, { textAlign: 'center', marginTop: space.md }]}>
      <Text accessibilityRole="link" onPress={openPrivacy} style={{ color: c.inkMuted, textDecorationLine: 'underline' }}>
        Privacy Policy
      </Text>
      {'  ·  '}
      <Text accessibilityRole="link" onPress={openTerms} style={{ color: c.inkMuted, textDecorationLine: 'underline' }}>
        Terms of Service
      </Text>
    </Text>
  );
}
