import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, type TextStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { formatPrice, orderTotal, type AddOn, type Service, type Zone } from '@clean-crep/shared';
import { Icon, type IconName } from '@/components/icon';
import { useAuth } from '@/lib/auth';
import { useMembership } from '@/hooks/use-membership';
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
import { Button, Overline, ScreenHeader } from '@/components/ui';
import { success, tapLight } from '@/lib/haptics';
import { c, elevation, radius, space, type } from '@/theme';

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
  const insets = useSafeAreaInsets();
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
  const [useCredit, setUseCredit] = useState(true);
  const { membership, reload: reloadMembership } = useMembership();
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
  // Clean Crep Club (Phase 3): a care credit covers the service's base price;
  // add-ons and CrepRun are still charged. The database applies the same rule.
  const creditCost = selected?.credit_cost ?? 1;
  const canUseCredit = membership?.status === 'active' && membership.balance >= creditCost && selected?.price_cents != null;
  const creditApplied = canUseCredit && useCredit;
  const fullTotal = selected ? orderTotal(selected.price_cents, charged) : null;
  const total = fullTotal !== null && creditApplied && selected?.price_cents != null ? Math.max(fullTotal - selected.price_cents, 0) : fullTotal;
  const hasKit = extras.some((a) => a.kind === 'kit');

  function togglePick(id: string) {
    tapLight();
    const on = !picked.includes(id);
    setPicked((p) => (on ? [...p, id] : p.filter((x) => x !== id)));
    const addOn = pickable.find((a) => a.id === id);
    if (addOn) track('addon_toggled', { addon: addOn.name, on });
  }

  function selectZone(z: Zone) {
    tapLight();
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
      redeem_credit: creditApplied,
    });
    setSubmitting(false);
    if (insertError) {
      setError(friendlyError(insertError, 'booking'));
      return;
    }
    success();
    if (creditApplied) reloadMembership();
    track('booking_confirmed', {
      order_total_jmd: total === null ? null : Math.round(total / 100),
      addons_count: extras.length,
      // Booked add-on names (sorted, comma-separated) so attach rate counts bookings, not ticks.
      addons: extras.map((a) => a.name).sort().join(', ') || null,
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
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
        <Header title="Confirm Booking" onBack={() => setStep(1)} />
        <ScrollView contentContainerStyle={{ padding: space.lg, alignItems: 'center', paddingBottom: space.xxl }}>
          <View style={{ marginBottom: space.md }}>
            <CreppieArt mood="success" size={136} />
          </View>
          <Text style={[type.title, { marginBottom: space.xxs }]}>You&apos;re booked.</Text>
          <Text style={[type.bodyStrong, { color: c.accent, marginBottom: space.xs }]}>{MOODS.success.title}</Text>
          <Text style={[type.body, { color: c.inkMuted, marginBottom: space.lg, textAlign: 'center' }]}>
            {dropoff ? 'Bring in' : 'CrepRun collects'} your {selected?.name === 'Clarks Clean' ? 'Clarks' : 'creps'} on{' '}
            <Text style={{ color: c.navy, fontFamily: type.bodyStrong.fontFamily }}>
              {date?.short} {date?.num}
            </Text>
            .{dropoff ? '\nShop 19, Pristine Plaza, Half Way Tree.' : ''}
          </Text>

          <PushOffer />

          <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.lg, width: '100%', marginBottom: space.lg }, elevation.card]}>
            <Overline style={{ marginBottom: space.sm }}>BOOKING SUMMARY</Overline>
            {[
              ['Service', selected?.name ?? '—'],
              ['Shoe Type', shoeType || '—'],
              ['Drop-off', dropoff ? 'In-store drop-off' : `CrepRun pickup · ${zone?.name ?? ''}`],
              ['Date', date ? `${date.short} ${date.num} ${date.month}` : '—'],
              [selected?.name ?? 'Service', selected ? formatPrice(selected.price_cents) : '—'],
              ...charged.map((a) => [a.name, a.price_cents === null ? 'On inspection' : `+${formatPrice(a.price_cents)}`]),
              ...(creditApplied && selected ? [[`Care credit${creditCost > 1 ? `s (${creditCost})` : ''}`, `−${formatPrice(selected.price_cents)}`]] : []),
            ].map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, marginBottom: space.xs }}>
                <Text style={[type.body, { color: c.inkMuted, flexShrink: 1 }]}>{k}</Text>
                <Text style={[type.bodyStrong, { flexShrink: 1, textAlign: 'right' }]}>{v}</Text>
              </View>
            ))}
            <View style={{ height: 1, backgroundColor: c.line, marginVertical: space.sm }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={type.overline}>Total</Text>
              <Text style={type.priceLg}>{formatPrice(total)}</Text>
            </View>
            <Text style={[type.caption, { marginTop: space.sm }]}>
              {dropoff ? 'Payment on drop-off.' : "We'll WhatsApp you on collection day."} Cash & transfer accepted.
              {hasKit ? ' Kits are paid for and collected at the shop.' : ''}
            </Text>
          </View>

          <View style={{ width: '100%', gap: space.sm }}>
            <Button variant="dark" label="Back to Home" onPress={resetAndGoHome} />
            <Button variant="secondary" label="Link Us on WhatsApp" icon={<Icon name="wa" size={18} color={c.navy} />} onPress={() => Linking.openURL(WHATSAPP_URL)} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 1 && selected) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
        <Header title="Booking Details" onBack={() => setStep(0)} />
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl }}>
          <View style={{ backgroundColor: c.navy, borderRadius: radius.lg, padding: space.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <Text style={[type.overline, { color: c.onNavyMuted }]}>SELECTED SERVICE</Text>
              <Text style={[type.headline, { color: c.white, marginTop: 2 }]}>{selected.name}</Text>
            </View>
            <Text style={[type.price, { color: c.white }]}>{formatPrice(selected.price_cents)}</Text>
          </View>

          <View>
            <Label>SHOE TYPE / MODEL</Label>
            <TextInput
              value={shoeType}
              onChangeText={setShoeType}
              placeholder="e.g. Nike Air Force 1, Clarks Desert Boot"
              placeholderTextColor={c.inkMuted}
              style={inputStyle}
            />
          </View>

          <View>
            <Label>DROP-OFF METHOD</Label>
            <View style={{ flexDirection: 'row', backgroundColor: c.ice, borderRadius: radius.md, padding: space.xxs }}>
              {[{ label: 'Drop Off', val: true }, { label: 'Pickup', val: false }].map((opt) => {
                const on = dropoff === opt.val;
                return (
                  <Pressable
                    key={String(opt.val)}
                    onPress={() => {
                      if (!on) tapLight();
                      setDropoff(opt.val);
                    }}
                    accessibilityRole="radio"
                    aria-checked={on}
                    style={[{ flex: 1, minHeight: 44, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.surface : 'transparent' }, on ? elevation.card : null]}
                  >
                    <Text style={[on ? type.bodyStrong : type.body, { color: on ? c.navy : c.inkMuted }]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {!dropoff && (
            <View>
              <Label>YOUR AREA · CREPRUN</Label>
              {zones.length === 0 ? (
                <Text style={[type.body, { color: c.inkMuted }]}>Couldn&apos;t load pickup areas. Message us on WhatsApp to arrange pickup.</Text>
              ) : (
                <View style={{ gap: space.xs }}>
                  {zones.map((z) => (
                    <ZoneRow key={z.id} zone={z} on={z.id === zoneId} onPress={() => selectZone(z)} />
                  ))}
                  <Text style={type.caption}>We collect and bring them back clean. Area not listed? Message us on WhatsApp.</Text>
                </View>
              )}
            </View>
          )}

          {!dropoff ? (
            pickupDay && (
              <View style={{ backgroundColor: c.ice, borderRadius: radius.md, padding: space.md }}>
                <Text style={type.body}>
                  CrepRun collects on{' '}
                  <Text style={{ fontFamily: type.bodyStrong.fontFamily }}>
                    {pickupDay.short} {pickupDay.num} {pickupDay.month}
                  </Text>
                </Text>
              </View>
            )
          ) : (
            <View>
              <Label>SELECT DATE</Label>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ gap: space.xs, paddingHorizontal: space.lg, paddingVertical: space.xxs }}>
                {days.map((d, i) => {
                  const on = selDay === i;
                  return (
                    <Pressable
                      key={i}
                      onPress={() => {
                        if (!on) tapLight();
                        setSelDay(i);
                      }}
                      style={[
                        { width: 60, alignItems: 'center', paddingVertical: space.sm, borderRadius: radius.md, backgroundColor: on ? c.accent : c.surface },
                        on ? null : elevation.bordered,
                      ]}
                    >
                      <Text style={[type.caption, { color: on ? c.white : c.inkMuted }]}>{d.short}</Text>
                      <Text style={[type.headline, { fontSize: 22, lineHeight: 26, color: on ? c.white : c.navy }]}>{d.num}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {pickable.length > 0 && (
            <View>
              <Label>LEVEL IT UP</Label>
              <View style={{ gap: space.xs }}>
                {pickable.map((a) => (
                  <AddOnRow key={a.id} addOn={a} on={picked.includes(a.id)} onPress={() => togglePick(a.id)} />
                ))}
              </View>
              {hasKit && (
                <Text style={[type.caption, { marginTop: space.xs }]}>Kits are paid for and collected at the shop. We&apos;ll confirm stock when you drop off.</Text>
              )}
            </View>
          )}

          <View>
            <Label>NOTES (OPTIONAL)</Label>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Any special instructions for your pair…"
              placeholderTextColor={c.inkMuted}
              multiline
              numberOfLines={3}
              style={[inputStyle, { minHeight: 88, textAlignVertical: 'top' }]}
            />
          </View>

          {error && (
            <View style={{ gap: space.xs }}>
              <Text style={[type.body, { color: c.danger }]}>{error}</Text>
              <Pressable onPress={() => Linking.openURL(WHATSAPP_URL)}>
                <Text style={[type.bodyStrong, { color: c.accent }]}>Message us on WhatsApp</Text>
              </Pressable>
            </View>
          )}

          {canUseCredit && membership && (
            <Pressable
              testID="use-credit"
              onPress={() => setUseCredit((v) => !v)}
              accessibilityRole="checkbox"
              aria-checked={useCredit}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: useCredit ? c.accent : c.line, backgroundColor: useCredit ? c.ice : c.surface }}
            >
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: useCredit ? c.accent : c.line, backgroundColor: useCredit ? c.accent : c.surface, alignItems: 'center', justifyContent: 'center' }}>
                {useCredit && <Icon name="check" size={14} color={c.white} strokeWidth={2.5} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={type.bodyStrong}>
                  Use {creditCost} care credit{creditCost > 1 ? 's' : ''}
                </Text>
                <Text style={type.caption}>
                  Covers the {formatPrice(selected?.price_cents ?? null)} clean · {membership.balance} left on {membership.plan.name}
                </Text>
              </View>
            </Pressable>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={type.overline}>TOTAL</Text>
            <Text style={type.priceLg}>{formatPrice(total)}</Text>
          </View>

          <Button label={submitting ? 'Booking…' : 'Confirm Booking'} onPress={confirmBooking} disabled={submitting} />
          {!session && (
            <Text style={[type.caption, { textAlign: 'center' }]}>You&apos;ll sign in or create an account to confirm. Your details stay filled in.</Text>
          )}
        </ScrollView>

        <Modal visible={signInOpen} animationType="slide" transparent onRequestClose={() => setSignInOpen(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,31,68,0.55)' }}>
            <View style={{ paddingBottom: insets.bottom, backgroundColor: c.navy, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg }}>
              <ScrollView contentContainerStyle={{ padding: space.lg }} keyboardShouldPersistTaps="handled">
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md }}>
                  <Text style={[type.headline, { color: c.white }]}>One last step</Text>
                  <Pressable onPress={() => setSignInOpen(false)} hitSlop={12}>
                    <Text style={[type.bodyStrong, { color: c.onNavyMuted }]}>Cancel</Text>
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
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScreenHeader title="Book a Clean" subtitle="Choose a service to get started." />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 104, gap: space.sm }}>
        <Overline style={{ marginBottom: space.xxs }}>AVAILABLE SERVICES</Overline>
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
            style={[
              { backgroundColor: c.surface, borderRadius: radius.lg, padding: space.lg },
              svc.popular ? { borderWidth: 1.5, borderColor: c.accent } : elevation.card,
            ]}
          >
            {svc.popular && (
              <View style={{ position: 'absolute', top: space.md, right: space.md, backgroundColor: c.accent, borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: space.sm }}>
                <Text style={[type.overline, { color: c.white, fontSize: 11, letterSpacing: 1.2 }]}>MOST POPULAR</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: c.ice, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={svc.icon as IconName} size={20} color={c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[type.headline, { marginBottom: space.xxs, paddingRight: svc.popular ? 104 : 0 }]}>{svc.name}</Text>
                <Text style={[type.body, { color: c.inkMuted, marginBottom: space.sm }]}>{svc.description}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.xs }}>
                  <Text style={type.price}>{formatPrice(svc.price_cents)}</Text>
                  <Text style={type.caption}>{svc.note}</Text>
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
    <View style={{ backgroundColor: c.surface, paddingHorizontal: space.md, paddingVertical: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
      <Pressable onPress={onBack} accessibilityLabel="Back" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="chevronL" size={22} color={c.navy} />
      </Pressable>
      <Text style={type.headline}>{title}</Text>
    </View>
  );
}

function ZoneRow({ zone, on, onPress }: { zone: Zone; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      aria-checked={on}
      style={[
        { backgroundColor: on ? c.ice : c.surface, borderRadius: radius.md, padding: space.md, flexDirection: 'row', gap: space.sm, alignItems: 'center' },
        on ? { borderWidth: 1.5, borderColor: c.accent } : elevation.bordered,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={type.bodyStrong}>
          {zone.name} · {zone.pickup_day}s
        </Text>
        <Text style={[type.caption, { marginTop: 2 }]}>{zone.areas}</Text>
      </View>
      <Text style={[type.bodyStrong, { color: c.accent }]}>+{formatPrice(zone.rate_cents)}</Text>
    </Pressable>
  );
}

function AddOnRow({ addOn, on, onPress }: { addOn: AddOn; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      aria-checked={on}
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: on ? c.ice : c.surface, borderRadius: radius.md, padding: space.md },
        on ? { borderWidth: 1.5, borderColor: c.accent } : elevation.bordered,
      ]}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: radius.sm - 2,
          borderWidth: 1.5,
          borderColor: on ? c.accent : c.line,
          backgroundColor: on ? c.accent : c.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {on && <Icon name="check" size={14} color={c.white} strokeWidth={3} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={type.bodyStrong}>
          {addOn.name}
          {addOn.kind === 'kit' ? '  ·  Kit' : ''}
        </Text>
        {!!addOn.description && <Text style={[type.caption, { marginTop: 2 }]}>{addOn.description}</Text>}
      </View>
      <Text style={[type.bodyStrong, { color: c.accent }]}>{addOn.price_cents === null ? 'Quote' : `+${formatPrice(addOn.price_cents)}`}</Text>
    </Pressable>
  );
}

function Label({ children }: { children: string }) {
  return <Overline style={{ marginBottom: space.xs }}>{children}</Overline>;
}

const inputStyle: TextStyle = {
  borderWidth: 1,
  borderColor: c.line,
  borderRadius: radius.md,
  minHeight: 52,
  paddingVertical: space.sm,
  paddingHorizontal: space.md,
  fontFamily: type.body.fontFamily,
  fontSize: type.body.fontSize,
  color: c.navy,
  backgroundColor: c.surface,
};
