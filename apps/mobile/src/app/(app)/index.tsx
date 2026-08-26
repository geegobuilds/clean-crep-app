import { Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, formatPrice, TRACKER_STEPS, stepFromStatus } from '@clean-crep/shared';
import { Icon, type IconName } from '@/components/icon';
import { StatusTag } from '@/components/status-tag';
import { useAuth } from '@/lib/auth';
import { useServices } from '@/hooks/use-services';
import { useOrders } from '@/hooks/use-orders';

const logo = require('../../../assets/brand/logo.png');
const WHATSAPP_URL = 'https://wa.me/18765072163';

function formatEta(dateIso: string): string {
  const today = new Date();
  const d = new Date(dateIso);
  if (d.toDateString() === today.toDateString()) return 'Today';
  return d.toLocaleDateString('en-JM', { month: 'short', day: 'numeric' });
}

export default function HomeScreen() {
  const router = useRouter();
  const { customer } = useAuth();
  const { services } = useServices();
  const { orders } = useOrders();
  const activeOrders = orders.filter((o) => o.status !== 'completed').slice(0, 3);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.offWhite }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header */}
        <View
          style={{
            padding: 20,
            paddingTop: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.white,
          }}
        >
          <Image source={logo} style={{ width: 36, height: 36, borderRadius: 18 }} />
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 11, color: colors.caption, fontFamily: 'DMSans_400Regular' }}>WELCOME BACK</Text>
            <Text style={{ fontSize: 15, fontFamily: 'DMSans_500Medium', color: colors.navy }}>
              Hi, {customer?.name ?? 'there'} 👋
            </Text>
          </View>
        </View>

        <View style={{ padding: 20, gap: 16 }}>
          {/* Hero card */}
          <View style={{ backgroundColor: colors.navy, borderRadius: 16, padding: 20, paddingVertical: 24, overflow: 'hidden' }}>
            <View
              style={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: 'rgba(26,111,212,0.15)',
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: -30,
                right: 20,
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: 'rgba(26,111,212,0.1)',
              }}
            />
            <Text style={{ fontSize: 10, fontFamily: 'DMSans_500Medium', color: colors.softBlue, letterSpacing: 2, marginBottom: 8 }}>
              CLEAN CREP JAMAICA
            </Text>
            <Text style={{ fontSize: 22, fontFamily: 'DMSans_500Medium', color: colors.white, lineHeight: 28, marginBottom: 6 }}>
              Your Creps{'\n'}Deserve Better.
            </Text>
            <Text style={{ fontSize: 12, color: colors.softBlue, marginBottom: 20, lineHeight: 18, fontFamily: 'DMSans_400Regular' }}>
              Drop in at Half Way Tree or{'\n'}link us to book your clean.
            </Text>
            <Pressable
              onPress={() => router.push('/book')}
              style={{ backgroundColor: colors.blue, borderRadius: 8, paddingVertical: 11, paddingHorizontal: 22, alignSelf: 'flex-start' }}
            >
              <Text style={{ color: colors.white, fontSize: 13, fontFamily: 'DMSans_500Medium' }}>Book a Clean</Text>
            </Pressable>
          </View>

          {/* Services row */}
          <View>
            <Text style={{ fontSize: 10, fontFamily: 'DMSans_500Medium', color: colors.caption, letterSpacing: 2, marginBottom: 10 }}>
              SERVICES
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {services.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => router.push('/book')}
                  style={{
                    flex: 1,
                    backgroundColor: colors.white,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    padding: 12,
                    paddingVertical: 12,
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.ice, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={s.icon as IconName} size={17} color={colors.blue} />
                  </View>
                  <Text style={{ fontSize: 11, fontFamily: 'DMSans_500Medium', color: colors.navy, textAlign: 'center' }}>{s.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.blue, fontFamily: 'DMSans_500Medium' }}>{formatPrice(s.price_cents)}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Active orders */}
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: 10, fontFamily: 'DMSans_500Medium', color: colors.caption, letterSpacing: 2 }}>ACTIVE ORDERS</Text>
              <Pressable onPress={() => router.push('/orders')}>
                <Text style={{ fontSize: 11, color: colors.blue, fontFamily: 'DMSans_500Medium' }}>See All</Text>
              </Pressable>
            </View>
            <View style={{ gap: 8 }}>
              {activeOrders.length === 0 && (
                <Text style={{ fontSize: 12, color: colors.caption, fontFamily: 'DMSans_400Regular' }}>No active orders right now.</Text>
              )}
              {activeOrders.map((o) => {
                const pct = Math.round((stepFromStatus(o.status) / TRACKER_STEPS.length) * 100);
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => router.push('/orders')}
                    style={{ backgroundColor: colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                      <View>
                        <Text style={{ fontSize: 13, fontFamily: 'DMSans_500Medium', color: colors.navy }}>{o.item_name}</Text>
                        <Text style={{ fontSize: 11, color: colors.caption, marginTop: 2, fontFamily: 'DMSans_400Regular' }}>
                          {o.order_number} · {o.service.name}
                        </Text>
                      </View>
                      <StatusTag status={o.status} />
                    </View>
                    <View style={{ height: 4, backgroundColor: colors.ice, borderRadius: 99, overflow: 'hidden' }}>
                      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: colors.blue, borderRadius: 99 }} />
                    </View>
                    <Text style={{ fontSize: 11, color: colors.caption, marginTop: 6, fontFamily: 'DMSans_400Regular' }}>
                      Est. ready: <Text style={{ color: colors.navy, fontFamily: 'DMSans_500Medium' }}>{formatEta(o.scheduled_date)}</Text>
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* WhatsApp banner */}
          <View style={{ backgroundColor: colors.navy, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 12, fontFamily: 'DMSans_500Medium', color: colors.white, marginBottom: 2 }}>Questions? Link us.</Text>
              <Text style={{ fontSize: 11, color: colors.softBlue, fontFamily: 'DMSans_400Regular' }}>Shop 19, Pristine Plaza, HWT</Text>
            </View>
            <Pressable
              onPress={() => Linking.openURL(WHATSAPP_URL)}
              style={{ backgroundColor: colors.whatsapp, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Icon name="wa" size={14} color={colors.white} />
              <Text style={{ color: colors.white, fontSize: 12, fontFamily: 'DMSans_500Medium' }}>WhatsApp</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
