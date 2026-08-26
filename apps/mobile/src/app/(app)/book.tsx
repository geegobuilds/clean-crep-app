import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, formatPrice, type Service } from '@clean-crep/shared';
import { Icon, type IconName } from '@/components/icon';
import { useAuth } from '@/lib/auth';
import { useServices } from '@/hooks/use-services';
import { supabase } from '@/lib/supabase';

const WHATSAPP_URL = 'https://wa.me/18765072163';

interface Day {
  short: string;
  num: number;
  month: string;
  iso: string;
}

export default function BookingScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { services } = useServices();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [selected, setSelected] = useState<Service | null>(null);
  const [dropoff, setDropoff] = useState(true);
  const [selDay, setSelDay] = useState(0);
  const [notes, setNotes] = useState('');
  const [shoeType, setShoeType] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days: Day[] = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return {
        short: d.toLocaleDateString('en-JM', { weekday: 'short' }),
        num: d.getDate(),
        month: d.toLocaleDateString('en-JM', { month: 'short' }),
        iso: d.toISOString().slice(0, 10),
      };
    });
  }, []);

  async function confirmBooking() {
    if (!session || !selected) return;
    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase.from('orders').insert({
      customer_id: session.user.id,
      service_id: selected.id,
      item_name: shoeType || selected.name,
      drop_method: dropoff ? 'dropoff' : 'pickup',
      scheduled_date: days[selDay].iso,
      notes: notes || null,
      price_cents: selected.price_cents,
    });
    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setStep(2);
  }

  function resetAndGoHome() {
    setStep(0);
    setSelected(null);
    setShoeType('');
    setNotes('');
    router.push('/');
  }

  if (step === 2) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.offWhite }} edges={['top']}>
        <Header title="Confirm Booking" onBack={() => setStep(1)} />
        <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Icon name="check" size={26} color="#16A34A" strokeWidth={2} />
          </View>
          <Text style={{ fontSize: 22, fontFamily: 'DMSans_500Medium', color: colors.navy, marginBottom: 6 }}>You&apos;re booked.</Text>
          <Text style={{ fontSize: 13, color: colors.caption, lineHeight: 20, marginBottom: 24, textAlign: 'center', fontFamily: 'DMSans_400Regular' }}>
            Bring in your {selected?.name === 'Clarks Clean' ? 'Clarks' : 'creps'} on{' '}
            <Text style={{ color: colors.navy, fontFamily: 'DMSans_500Medium' }}>
              {days[selDay].short} {days[selDay].num}
            </Text>
            .{'\n'}Shop 19, Pristine Plaza, Half Way Tree.
          </Text>

          <View style={{ backgroundColor: colors.ice, borderRadius: 12, padding: 16, width: '100%', marginBottom: 20 }}>
            <Text style={{ fontSize: 10, color: colors.caption, letterSpacing: 2, marginBottom: 12, fontFamily: 'DMSans_500Medium' }}>
              BOOKING SUMMARY
            </Text>
            {[
              ['Service', selected?.name ?? '—'],
              ['Shoe Type', shoeType || '—'],
              ['Drop-off', dropoff ? 'In-store drop-off' : 'Pickup requested'],
              ['Date', `${days[selDay].short} ${days[selDay].num} ${days[selDay].month}`],
              ['Price', selected ? formatPrice(selected.price_cents) : '—'],
            ].map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: colors.caption, fontFamily: 'DMSans_400Regular' }}>{k}</Text>
                <Text style={{ fontSize: 12, fontFamily: 'DMSans_500Medium', color: colors.navy }}>{v}</Text>
              </View>
            ))}
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
            <Text style={{ fontSize: 11, color: colors.caption, fontFamily: 'DMSans_400Regular' }}>
              Payment on drop-off. Cash & transfer accepted.
            </Text>
          </View>

          <Pressable onPress={resetAndGoHome} style={{ width: '100%', backgroundColor: colors.navy, borderRadius: 8, paddingVertical: 13, alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: colors.white, fontSize: 13, fontFamily: 'DMSans_500Medium' }}>Back to Home</Text>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL(WHATSAPP_URL)}
            style={{ width: '100%', backgroundColor: colors.whatsapp, borderRadius: 8, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
          >
            <Icon name="wa" size={16} color={colors.white} />
            <Text style={{ color: colors.white, fontSize: 13, fontFamily: 'DMSans_500Medium' }}>Link Us on WhatsApp</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 1 && selected) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.offWhite }} edges={['top']}>
        <Header title="Booking Details" onBack={() => setStep(0)} />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <View style={{ backgroundColor: colors.ice, borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 10, color: colors.caption, letterSpacing: 1.5, marginBottom: 2, fontFamily: 'DMSans_400Regular' }}>SELECTED SERVICE</Text>
              <Text style={{ fontSize: 14, fontFamily: 'DMSans_500Medium', color: colors.navy }}>{selected.name}</Text>
            </View>
            <Text style={{ fontSize: 18, fontFamily: 'DMSans_500Medium', color: colors.blue }}>{formatPrice(selected.price_cents)}</Text>
          </View>

          <View>
            <Label>SHOE TYPE / MODEL</Label>
            <TextInput
              value={shoeType}
              onChangeText={setShoeType}
              placeholder="e.g. Nike Air Force 1, Clarks Desert Boot"
              placeholderTextColor={colors.caption}
              style={inputStyle}
            />
          </View>

          <View>
            <Label>DROP-OFF METHOD</Label>
            <View style={{ flexDirection: 'row', backgroundColor: colors.ice, borderRadius: 8, padding: 3 }}>
              {[{ label: 'Drop Off', val: true }, { label: 'Pickup', val: false }].map((opt) => (
                <Pressable
                  key={String(opt.val)}
                  onPress={() => setDropoff(opt.val)}
                  style={{
                    flex: 1,
                    paddingVertical: 9,
                    borderRadius: 6,
                    alignItems: 'center',
                    backgroundColor: dropoff === opt.val ? colors.white : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 13, fontFamily: dropoff === opt.val ? 'DMSans_500Medium' : 'DMSans_400Regular', color: dropoff === opt.val ? colors.navy : colors.caption }}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <Label>SELECT DATE</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {days.map((d, i) => (
                <Pressable
                  key={i}
                  onPress={() => setSelDay(i)}
                  style={{
                    width: 50,
                    alignItems: 'center',
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: selDay === i ? colors.blue : colors.white,
                    borderWidth: selDay === i ? 0 : 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 9, fontFamily: 'DMSans_500Medium', opacity: 0.8, marginBottom: 2, color: selDay === i ? colors.white : colors.navy }}>{d.short}</Text>
                  <Text style={{ fontSize: 18, fontFamily: 'DMSans_500Medium', color: selDay === i ? colors.white : colors.navy }}>{d.num}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View>
            <Label>NOTES (OPTIONAL)</Label>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Any special instructions for your pair…"
              placeholderTextColor={colors.caption}
              multiline
              numberOfLines={3}
              style={[inputStyle, { minHeight: 72, textAlignVertical: 'top' }]}
            />
          </View>

          {error && <Text style={{ fontSize: 12, color: '#993C1D', fontFamily: 'DMSans_400Regular' }}>{error}</Text>}

          <Pressable
            onPress={confirmBooking}
            disabled={submitting}
            style={{ backgroundColor: colors.blue, borderRadius: 8, paddingVertical: 14, alignItems: 'center', opacity: submitting ? 0.6 : 1 }}
          >
            <Text style={{ color: colors.white, fontSize: 14, fontFamily: 'DMSans_500Medium' }}>
              {submitting ? 'Booking…' : 'Confirm Booking'}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.offWhite }} edges={['top']}>
      <View style={{ backgroundColor: colors.white, padding: 20, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 20, fontFamily: 'DMSans_500Medium', color: colors.navy }}>Book a Clean</Text>
        <Text style={{ fontSize: 13, color: colors.caption, marginTop: 4, fontFamily: 'DMSans_400Regular' }}>Choose a service to get started.</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}>
        <Text style={{ fontSize: 10, fontFamily: 'DMSans_500Medium', color: colors.caption, letterSpacing: 2, marginBottom: 4 }}>AVAILABLE SERVICES</Text>
        {services.map((svc) => (
          <Pressable
            key={svc.id}
            onPress={() => {
              setSelected(svc);
              setStep(1);
            }}
            style={{
              backgroundColor: colors.white,
              borderRadius: 12,
              borderWidth: svc.popular ? 1.5 : 1,
              borderColor: svc.popular ? colors.blue : colors.border,
              padding: 16,
            }}
          >
            {svc.popular && (
              <View style={{ position: 'absolute', top: 12, right: 12, backgroundColor: colors.ice, borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8 }}>
                <Text style={{ fontSize: 9, fontFamily: 'DMSans_500Medium', color: colors.blue, letterSpacing: 1 }}>MOST POPULAR</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.ice, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={svc.icon as IconName} size={18} color={colors.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontFamily: 'DMSans_500Medium', color: colors.navy, marginBottom: 4 }}>{svc.name}</Text>
                <Text style={{ fontSize: 11, color: colors.caption, lineHeight: 16, marginBottom: 10, fontFamily: 'DMSans_400Regular' }}>{svc.description}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={{ fontSize: 20, fontFamily: 'DMSans_500Medium', color: colors.blue }}>{formatPrice(svc.price_cents)}</Text>
                  <Text style={{ fontSize: 11, color: colors.caption, fontFamily: 'DMSans_400Regular' }}>{svc.note}</Text>
                </View>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={{ backgroundColor: colors.white, padding: 20, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Pressable onPress={onBack}>
        <Icon name="chevronL" size={20} color={colors.navy} />
      </Pressable>
      <Text style={{ fontSize: 15, fontFamily: 'DMSans_500Medium', color: colors.navy }}>{title}</Text>
    </View>
  );
}

function Label({ children }: { children: string }) {
  return (
    <Text style={{ fontSize: 10, fontFamily: 'DMSans_500Medium', color: colors.caption, letterSpacing: 2, marginBottom: 8 }}>{children}</Text>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 8,
  paddingVertical: 11,
  paddingHorizontal: 14,
  fontSize: 13,
  color: colors.charcoal,
  backgroundColor: colors.white,
  fontFamily: 'DMSans_400Regular',
} as const;
