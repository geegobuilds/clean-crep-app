import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, formatPrice, orderTotal, type AddOn, type Service, type Zone } from '@clean-crep/shared';
import { Icon, type IconName } from '@/components/icon';
import { useAuth } from '@/lib/auth';
import { useServices } from '@/hooks/use-services';
import { useAddOns } from '@/hooks/use-add-ons';
import { useZones } from '@/hooks/use-zones';
import { supabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';
import { SignInForm } from '@/components/sign-in-form';
import { CreppieButton } from '@/components/creppie-chat';
import { EmptyState, ErrorState, SkeletonList } from '@/components/states';
import { PushOffer } from '@/components/push-offer';
import { CreppieArt, MOODS } from '@/components/creppie';
import { track } from '@/lib/analytics';

const WHATSAPP_URL = 'https://wa.me/18765072163';

interface Day {
  short: string;
  num: number;
  month: string;
  iso: string;
}

function toDay(d: Date): Day {
  return {
    short: d.toLocaleDateString('en-JM', { weekday: 'short' }),
    num: d.getDate(),
    month: d.toLocaleDateString('en-JM', { month: 'short' }),
    iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  };
}

/** The zone's next CrepRun day, from tomorrow on. Mirrors next_pickup_date() in the database. */
function nextPickup(zone: Zone): Day | null {
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    if (d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() === zone.pickup_day.trim().toLowerCase()) return toDay(d);
  }
  return null;
}

export default function BookingScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { services, loading: servicesLoading, error: servicesError, reload: reloadServices } = useServices();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [selected, setSelected] = useState<Service | null>(null);
  const addOns = useAddOns();
  const zones = useZones();
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [dropoff, setDropoff] = useState(true);
  const [selDay, setSelDay] = useState(0);
  const [notes, setNotes] = useState('');
  const [shoeType, setShoeType] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guests fill in the whole booking, then sign in here at the last step.
  // This is a sheet over the Book screen (not a route change), so every
  // selection above stays in state through sign-in.
  const [signInOpen, setSignInOpen] = useState(false);

  // Drop-off: the next 7 shop days (closed Sundays).
  const days: Day[] = useMemo(() => {
    const out: Day[] = [];
    for (let i = 0; out.length < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      if (d.getDay() !== 0) out.push(toDay(d));
    }
    return out;
  }, []);

  // Extras the customer ticked, plus their CrepRun zone's rate when picking
  // up: the same rule the database applies in price_app_order().
  const pickable = addOns.filter((a) => a.kind !== 'delivery');
  const extras = pickable.filter((a) => picked.includes(a.id));
  const zone = zones.find((z) => z.id === zoneId) ?? null;
  const pickupDay = zone ? nextPickup(zone) : null;
  const date: Day | null = dropoff ? days[selDay] : pickupDay;
  const creprun = !dropoff && zone ? { name: `CrepRun ${zone.name} (${zone.pickup_day})`, price_cents: zone.rate_cents } : null;
  const charged: Pick<AddOn, 'name' | 'price_cents'>[] = [...extras, ...(creprun ? [creprun] : [])];
  const total = selected ? orderTotal(selected.price_cents, charged) : null;
  const hasKit = extras.some((a) => a.kind === 'kit');

  function togglePick(id: string) {
    const on = !picked.includes(id);
    setPicked((p) => (on ? [...p, id] : p.filter((x) => x !== id)));
    const addOn = pickable.find((a) => a.id === id);
    if (addOn) track('addon_toggled', { addon: addOn.name, on });
  }

  function selectZone(z: Zone) {
    setZoneId(z.id);
    track('pickup_zone_selected', { zone: z.name });
  }

  function confirmBooking() {
    if (!selected) return;
    if (!dropoff && !zone) {
      setError('Pick your area so we know which day CrepRun collects.');
      return;
    }
    setError(null);
    if (!session) {
      setSignInOpen(true);
      track('signin_prompted', { where: 'book' });
      return;
    }
    placeBooking();
  }

  async function placeBooking() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    // Read the session fresh: right after in-sheet sign-in, the `session`
    // captured by this render is still null.
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setSubmitting(false);
      setSignInOpen(true);
      return;
    }
    if (!date) return;
    const { error: insertError } = await supabase.from('orders').insert({
      customer_id: userId,
      service_id: selected.id,
      location_id: selected.location_id,
      item_name: shoeType || selected.name,
      drop_method: dropoff ? 'dropoff' : 'pickup',
      zone_id: dropoff ? null : zoneId,
      // For pickups the database sets this to the zone's next CrepRun day.
      scheduled_date: date.iso,
      notes: notes || null,
      // The database re-prices this from add_ons + zone; sent for older
      // schemas only.
      add_ons: extras.map((a) => ({ id: a.id })),
      price_cents: total,
      currency: selected.currency,
    });
    setSubmitting(false);
    if (insertError) {
      setError(friendlyError(insertError, 'booking'));
      return;
    }
    track('booking_confirmed', {
      order_total_jmd: total === null ? null : Math.round(total / 100),
      addons_count: extras.length,
      method: dropoff ? 'dropoff' : 'pickup',
      source: 'app',
    });
    setStep(2);
  }

  function resetAndGoHome() {
    setStep(0);
    setSelected(null);
    setPicked([]);
    setShoeType('');
    setNotes('');
    router.push('/');
  }

  if (step === 2) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.offWhite }} edges={['top']}>
        <Header title="Confirm Booking" onBack={() => setStep(1)} />
        <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
          <View style={{ marginBottom: 16 }}>
            <CreppieArt mood="success" size={136} />
          </View>
          <Text style={{ fontSize: 22, fontFamily: 'DMSans_500Medium', color: colors.navy, marginBottom: 4 }}>You&apos;re booked.</Text>
          <Text style={{ fontSize: 13, fontFamily: 'DMSans_500Medium', color: colors.blue, marginBottom: 8 }}>{MOODS.success.title}</Text>
          <Text style={{ fontSize: 13, color: colors.caption, lineHeight: 20, marginBottom: 24, textAlign: 'center', fontFamily: 'DMSans_400Regular' }}>
            {dropoff ? 'Bring in' : 'CrepRun collects'} your {selected?.name === 'Clarks Clean' ? 'Clarks' : 'creps'} on{' '}
            <Text style={{ color: colors.navy, fontFamily: 'DMSans_500Medium' }}>
              {date?.short} {date?.num}
            </Text>
            .{dropoff ? '\nShop 19, Pristine Plaza, Half Way Tree.' : ''}
          </Text>

          <PushOffer />

          <View style={{ backgroundColor: colors.ice, borderRadius: 12, padding: 16, width: '100%', marginBottom: 20 }}>
            <Text style={{ fontSize: 10, color: colors.caption, letterSpacing: 2, marginBottom: 12, fontFamily: 'DMSans_500Medium' }}>
              BOOKING SUMMARY
            </Text>
            {[
              ['Service', selected?.name ?? '—'],
              ['Shoe Type', shoeType || '—'],
              ['Drop-off', dropoff ? 'In-store drop-off' : `CrepRun pickup · ${zone?.name ?? ''}`],
              ['Date', date ? `${date.short} ${date.num} ${date.month}` : '—'],
              [selected?.name ?? 'Service', selected ? formatPrice(selected.price_cents) : '—'],
              ...charged.map((a) => [a.name, a.price_cents === null ? 'On inspection' : `+${formatPrice(a.price_cents)}`]),
              ['Total', formatPrice(total)],
            ].map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: colors.caption, fontFamily: 'DMSans_400Regular' }}>{k}</Text>
                <Text style={{ fontSize: 12, fontFamily: 'DMSans_500Medium', color: colors.navy }}>{v}</Text>
              </View>
            ))}
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
            <Text style={{ fontSize: 11, color: colors.caption, fontFamily: 'DMSans_400Regular' }}>
              {dropoff ? 'Payment on drop-off.' : "We'll WhatsApp you on collection day."} Cash & transfer accepted.
              {hasKit ? ' Kits are paid for and collected at the shop.' : ''}
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

          {!dropoff && (
            <View>
              <Label>YOUR AREA · CREPRUN</Label>
              {zones.length === 0 ? (
                <Text style={{ fontSize: 12, color: colors.caption, fontFamily: 'DMSans_400Regular' }}>
                  Couldn&apos;t load pickup areas. Message us on WhatsApp to arrange pickup.
                </Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {zones.map((z) => (
                    <ZoneRow key={z.id} zone={z} on={z.id === zoneId} onPress={() => selectZone(z)} />
                  ))}
                  <Text style={{ fontSize: 11, color: colors.caption, fontFamily: 'DMSans_400Regular' }}>
                    We collect and bring them back clean. Area not listed? Message us on WhatsApp.
                  </Text>
                </View>
              )}
            </View>
          )}

          {!dropoff ? (
            pickupDay && (
              <View style={{ backgroundColor: colors.ice, borderRadius: 10, padding: 12 }}>
                <Text style={{ fontSize: 12, color: colors.navy, fontFamily: 'DMSans_400Regular' }}>
                  CrepRun collects on{' '}
                  <Text style={{ fontFamily: 'DMSans_500Medium' }}>
                    {pickupDay.short} {pickupDay.num} {pickupDay.month}
                  </Text>
                </Text>
              </View>
            )
          ) : (
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
          )}

          {pickable.length > 0 && (
            <View>
              <Label>LEVEL IT UP</Label>
              <View style={{ gap: 8 }}>
                {pickable.map((a) => (
                  <AddOnRow key={a.id} addOn={a} on={picked.includes(a.id)} onPress={() => togglePick(a.id)} />
                ))}
              </View>
              {hasKit && (
                <Text style={{ fontSize: 11, color: colors.caption, marginTop: 6, fontFamily: 'DMSans_400Regular' }}>
                  Kits are paid for and collected at the shop. We&apos;ll confirm stock when you drop off.
                </Text>
              )}
            </View>
          )}

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

          {error && (
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, color: '#993C1D', fontFamily: 'DMSans_400Regular' }}>{error}</Text>
              <Pressable onPress={() => Linking.openURL(WHATSAPP_URL)}>
                <Text style={{ fontSize: 12, color: colors.blue, fontFamily: 'DMSans_500Medium' }}>Message us on WhatsApp</Text>
              </Pressable>
            </View>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={{ fontSize: 12, color: colors.caption, fontFamily: 'DMSans_500Medium', letterSpacing: 1.5 }}>TOTAL</Text>
            <Text style={{ fontSize: 20, color: colors.navy, fontFamily: 'DMSans_500Medium' }}>{formatPrice(total)}</Text>
          </View>

          <Pressable
            onPress={confirmBooking}
            disabled={submitting}
            style={{ backgroundColor: colors.blue, borderRadius: 8, paddingVertical: 14, alignItems: 'center', opacity: submitting ? 0.6 : 1 }}
          >
            <Text style={{ color: colors.white, fontSize: 14, fontFamily: 'DMSans_500Medium' }}>
              {submitting ? 'Booking…' : 'Confirm Booking'}
            </Text>
          </Pressable>
          {!session && (
            <Text style={{ fontSize: 11, color: colors.caption, textAlign: 'center', fontFamily: 'DMSans_400Regular' }}>
              You&apos;ll sign in or create an account to confirm. Your details stay filled in.
            </Text>
          )}
        </ScrollView>

        <Modal visible={signInOpen} animationType="slide" transparent onRequestClose={() => setSignInOpen(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,31,68,0.55)' }}>
            <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.navy, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 15, fontFamily: 'DMSans_500Medium', color: colors.white }}>One last step</Text>
                  <Pressable onPress={() => setSignInOpen(false)} hitSlop={12}>
                    <Text style={{ fontSize: 13, fontFamily: 'DMSans_500Medium', color: colors.softBlue }}>Cancel</Text>
                  </Pressable>
                </View>
                <SignInForm
                  subtitle={`Sign in to confirm your ${selected.name}. We'll use this to send you updates on your pair.`}
                  onSuccess={() => {
                    setSignInOpen(false);
                    placeBooking();
                  }}
                />
              </ScrollView>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.offWhite }} edges={['top']}>
      <View style={{ backgroundColor: colors.white, padding: 20, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 20, fontFamily: 'DMSans_500Medium', color: colors.navy }}>Book a Clean</Text>
        <Text style={{ fontSize: 13, color: colors.caption, marginTop: 4, fontFamily: 'DMSans_400Regular' }}>Choose a service to get started.</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 88, gap: 10 }}>
        <Text style={{ fontSize: 10, fontFamily: 'DMSans_500Medium', color: colors.caption, letterSpacing: 2, marginBottom: 4 }}>AVAILABLE SERVICES</Text>
        {servicesLoading && services.length === 0 && <SkeletonList count={4} variant="service" />}
        {servicesError && !servicesLoading && <ErrorState message={servicesError} onRetry={reloadServices} />}
        {!servicesLoading && !servicesError && services.length === 0 && (
          <EmptyState
            title="No services listed right now"
            body="Message us on WhatsApp and we'll sort out your clean directly."
            actionLabel="WhatsApp Us"
            onAction={() => Linking.openURL(WHATSAPP_URL)}
          />
        )}
        {services.map((svc) => (
          <Pressable
            key={svc.id}
            onPress={() => {
              setSelected(svc);
              setStep(1);
              track('booking_started', { service: svc.name, platform: 'app' });
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
      <CreppieButton />
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

function ZoneRow({ zone, on, onPress }: { zone: Zone; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      style={{
        backgroundColor: on ? colors.ice : colors.white,
        borderWidth: on ? 1.5 : 1,
        borderColor: on ? colors.blue : colors.border,
        borderRadius: 10,
        padding: 12,
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontFamily: 'DMSans_500Medium', color: colors.navy }}>
          {zone.name} · {zone.pickup_day}s
        </Text>
        <Text style={{ fontSize: 11, color: colors.caption, marginTop: 2, fontFamily: 'DMSans_400Regular' }}>{zone.areas}</Text>
      </View>
      <Text style={{ fontSize: 13, fontFamily: 'DMSans_500Medium', color: colors.blue }}>+{formatPrice(zone.rate_cents)}</Text>
    </Pressable>
  );
}

function AddOnRow({ addOn, on, onPress }: { addOn: AddOn; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: on ? colors.ice : colors.white,
        borderWidth: on ? 1.5 : 1,
        borderColor: on ? colors.blue : colors.border,
        borderRadius: 10,
        padding: 12,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 5,
          borderWidth: 1.5,
          borderColor: on ? colors.blue : colors.border,
          backgroundColor: on ? colors.blue : colors.white,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {on && <Icon name="check" size={12} color={colors.white} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontFamily: 'DMSans_500Medium', color: colors.navy }}>
          {addOn.name}
          {addOn.kind === 'kit' ? '  ·  Kit' : ''}
        </Text>
        {!!addOn.description && (
          <Text style={{ fontSize: 11, color: colors.caption, marginTop: 2, fontFamily: 'DMSans_400Regular' }}>{addOn.description}</Text>
        )}
      </View>
      <Text style={{ fontSize: 13, fontFamily: 'DMSans_500Medium', color: colors.blue }}>
        {addOn.price_cents === null ? 'Quote' : `+${formatPrice(addOn.price_cents)}`}
      </Text>
    </Pressable>
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
