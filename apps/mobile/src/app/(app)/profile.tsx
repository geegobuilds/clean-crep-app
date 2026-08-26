import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, formatPrice } from '@clean-crep/shared';
import { Icon, type IconName } from '@/components/icon';
import { StatusTag } from '@/components/status-tag';
import { useAuth } from '@/lib/auth';
import { useOrders } from '@/hooks/use-orders';

const LOYALTY_GOAL = 500;

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

function memberSince(dateIso: string): string {
  const months = Math.max(
    0,
    Math.round((Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60 * 24 * 30))
  );
  if (months < 12) return `${months}mo`;
  return `${Math.round(months / 12)}yr`;
}

export default function ProfileScreen() {
  const { customer, signOut } = useAuth();
  const { orders } = useOrders();
  const pastOrders = orders.filter((o) => o.status === 'completed');
  const points = customer?.loyalty_points ?? 0;
  const pctToGoal = Math.min(100, Math.round((points / LOYALTY_GOAL) * 100));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.offWhite }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ backgroundColor: colors.navy, padding: 20, paddingTop: 24, paddingBottom: 28, alignItems: 'center' }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 22, fontFamily: 'DMSans_500Medium', color: colors.white }}>{initials(customer?.name ?? '?')}</Text>
          </View>
          <Text style={{ fontSize: 18, fontFamily: 'DMSans_500Medium', color: colors.white }}>{customer?.name ?? 'Customer'}</Text>
          <Text style={{ fontSize: 12, color: colors.softBlue, marginTop: 3, fontFamily: 'DMSans_400Regular' }}>{customer?.email ?? ''}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 20 }}>
            {[
              { label: 'CLEANS', val: String(pastOrders.length) },
              { label: 'POINTS', val: String(points) },
              { label: 'MEMBER', val: customer ? memberSince(customer.member_since) : '—' },
            ].map((stat) => (
              <View key={stat.label} style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontFamily: 'DMSans_500Medium', color: colors.white }}>{stat.val}</Text>
                <Text style={{ fontSize: 9, color: colors.softBlue, letterSpacing: 1.5, fontFamily: 'DMSans_500Medium', marginTop: 2 }}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ padding: 20, gap: 16 }}>
          {/* Loyalty card */}
          <View style={{ backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View>
                <Text style={{ fontSize: 10, fontFamily: 'DMSans_500Medium', color: colors.caption, letterSpacing: 2, marginBottom: 2 }}>LOYALTY POINTS</Text>
                <Text style={{ fontSize: 15, fontFamily: 'DMSans_500Medium', color: colors.navy }}>{points} / {LOYALTY_GOAL} pts</Text>
              </View>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.ice, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="star" size={17} color={colors.blue} />
              </View>
            </View>
            <View style={{ height: 6, backgroundColor: colors.ice, borderRadius: 99, overflow: 'hidden' }}>
              <View style={{ width: `${pctToGoal}%`, height: '100%', backgroundColor: colors.blue, borderRadius: 99 }} />
            </View>
            <Text style={{ fontSize: 11, color: colors.caption, marginTop: 6, fontFamily: 'DMSans_400Regular' }}>
              {Math.max(0, LOYALTY_GOAL - points)} points to a <Text style={{ color: colors.navy, fontFamily: 'DMSans_500Medium' }}>free clean</Text>.
            </Text>
          </View>

          {/* Past orders */}
          <View>
            <Text style={{ fontSize: 10, fontFamily: 'DMSans_500Medium', color: colors.caption, letterSpacing: 2, marginBottom: 8 }}>PAST ORDERS</Text>
            <View style={{ backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
              {pastOrders.length === 0 && (
                <Text style={{ padding: 16, fontSize: 12, color: colors.caption, fontFamily: 'DMSans_400Regular' }}>No completed orders yet.</Text>
              )}
              {pastOrders.map((o, i) => (
                <View
                  key={o.id}
                  style={{
                    padding: 13,
                    paddingHorizontal: 16,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottomWidth: i < pastOrders.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View>
                    <Text style={{ fontSize: 13, fontFamily: 'DMSans_500Medium', color: colors.navy }}>{o.item_name}</Text>
                    <Text style={{ fontSize: 11, color: colors.caption, marginTop: 2, fontFamily: 'DMSans_400Regular' }}>
                      {o.service.name} · {new Date(o.scheduled_date).toLocaleDateString('en-JM', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={{ fontSize: 13, fontFamily: 'DMSans_500Medium', color: colors.blue }}>{formatPrice(o.price_cents)}</Text>
                    <StatusTag status="completed" />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Settings */}
          <View>
            <Text style={{ fontSize: 10, fontFamily: 'DMSans_500Medium', color: colors.caption, letterSpacing: 2, marginBottom: 8 }}>SETTINGS</Text>
            <View style={{ backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
              {(
                [
                  { icon: 'bell', label: 'Notifications' },
                  { icon: 'help', label: 'Help & Support' },
                  { icon: 'settings', label: 'Account Settings' },
                  { icon: 'logout', label: 'Sign Out', danger: true, onPress: signOut },
                ] as { icon: IconName; label: string; danger?: boolean; onPress?: () => void }[]
              ).map((item, i, arr) => (
                <Pressable
                  key={item.label}
                  onPress={item.onPress}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 13,
                    paddingHorizontal: 16,
                    borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: item.danger ? '#FEF3F0' : colors.ice, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={item.icon} size={16} color={item.danger ? '#993C1D' : colors.blue} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, fontFamily: 'DMSans_400Regular', color: item.danger ? '#993C1D' : colors.charcoal }}>{item.label}</Text>
                  {!item.danger && <Icon name="chevronR" size={16} color={colors.caption} />}
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
