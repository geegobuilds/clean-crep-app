import { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, TRACKER_STEPS, stepFromStatus } from '@clean-crep/shared';
import { Icon } from '@/components/icon';
import { StatusTag } from '@/components/status-tag';
import { useOrders } from '@/hooks/use-orders';

const WHATSAPP_URL = 'https://wa.me/18765072163';

function formatEta(dateIso: string): string {
  const today = new Date();
  const d = new Date(dateIso);
  if (d.toDateString() === today.toDateString()) return 'Today';
  return d.toLocaleDateString('en-JM', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function OrdersScreen() {
  const { orders } = useOrders();
  const [active, setActive] = useState<number | null>(null);
  const sel = orders[active ?? 0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.offWhite }} edges={['top']}>
      <View style={{ backgroundColor: colors.white, padding: 20, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 20, fontFamily: 'DMSans_500Medium', color: colors.navy }}>Orders</Text>
        <Text style={{ fontSize: 13, color: colors.caption, marginTop: 4, fontFamily: 'DMSans_400Regular' }}>Track your cleans.</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        {!sel && (
          <Text style={{ fontSize: 13, color: colors.caption, fontFamily: 'DMSans_400Regular' }}>No orders yet — book a clean to get started.</Text>
        )}

        {sel && (
          <View style={{ backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
            <View style={{ backgroundColor: colors.navy, padding: 16, paddingBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 10, color: colors.softBlue, marginBottom: 3, letterSpacing: 1.5, fontFamily: 'DMSans_500Medium' }}>
                    ORDER {sel.order_number}
                  </Text>
                  <Text style={{ fontSize: 17, fontFamily: 'DMSans_500Medium', color: colors.white }}>{sel.item_name}</Text>
                  <Text style={{ fontSize: 11, color: colors.softBlue, marginTop: 2, fontFamily: 'DMSans_400Regular' }}>{sel.service.name}</Text>
                </View>
                <StatusTag status={sel.status} />
              </View>
            </View>

            <View style={{ padding: 16 }}>
              <ProgressSteps step={stepFromStatus(sel.status)} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                <Text style={{ fontSize: 11, color: colors.caption, fontFamily: 'DMSans_400Regular' }}>
                  Est. ready: <Text style={{ color: colors.navy, fontFamily: 'DMSans_500Medium' }}>{formatEta(sel.scheduled_date)}</Text>
                </Text>
                <Pressable
                  onPress={() => Linking.openURL(WHATSAPP_URL)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.whatsapp, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12 }}
                >
                  <Icon name="wa" size={13} color={colors.white} />
                  <Text style={{ color: colors.white, fontSize: 11, fontFamily: 'DMSans_500Medium' }}>WhatsApp</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {orders.length > 0 && (
          <View>
            <Text style={{ fontSize: 10, fontFamily: 'DMSans_500Medium', color: colors.caption, letterSpacing: 2, marginBottom: 8 }}>ALL ORDERS</Text>
            <View style={{ gap: 8 }}>
              {orders.map((o, idx) => {
                const isActive = active === idx || (active === null && idx === 0);
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => setActive(idx)}
                    style={{
                      backgroundColor: colors.white,
                      borderRadius: 12,
                      padding: 13,
                      borderWidth: isActive ? 1.5 : 1,
                      borderColor: isActive ? colors.blue : colors.border,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 13, fontFamily: 'DMSans_500Medium', color: colors.navy }}>{o.item_name}</Text>
                      <Text style={{ fontSize: 11, color: colors.caption, marginTop: 2, fontFamily: 'DMSans_400Regular' }}>
                        {o.order_number} · {o.service.name}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <StatusTag status={o.status} />
                      <Text style={{ fontSize: 10, color: colors.caption, fontFamily: 'DMSans_400Regular' }}>{formatEta(o.scheduled_date)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProgressSteps({ step }: { step: number }) {
  const filledPct = Math.min(step / (TRACKER_STEPS.length - 1), 1) * 75;
  return (
    <View>
      <View style={{ position: 'relative', height: 20, justifyContent: 'center' }}>
        <View style={{ position: 'absolute', left: '12.5%', right: '12.5%', height: 2, backgroundColor: colors.ice }} />
        <View style={{ position: 'absolute', left: '12.5%', width: `${filledPct}%`, height: 2, backgroundColor: colors.blue }} />
      </View>
      <View style={{ flexDirection: 'row', marginTop: -14 }}>
        {TRACKER_STEPS.map((label, i) => {
          const done = i < step;
          const cur = i === step - 1;
          return (
            <View key={label} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: done || cur ? colors.blue : colors.ice,
                  borderWidth: cur ? 2 : 0,
                  borderColor: colors.blue,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 9, fontFamily: 'DMSans_500Medium', color: done || cur ? colors.white : colors.caption }}>
                  {done ? '✓' : i + 1}
                </Text>
              </View>
              <Text style={{ fontSize: 8, color: cur ? colors.navy : colors.caption, fontFamily: cur ? 'DMSans_500Medium' : 'DMSans_400Regular', textAlign: 'center' }}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
