import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions, type TextStyle } from 'react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient as SvgGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { setStatusBarStyle } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { formatPrice, orderTotal, pairFitsService, pairTitle, serviceKind, type AddOn, type Service, type Zone } from '@clean-crep/shared';
import { Icon } from '@/components/icon';
import { useAuth } from '@/lib/auth';
import { useMembership } from '@/hooks/use-membership';
import { useServices } from '@/hooks/use-services';
import { useFeatures } from '@/hooks/use-features';
import { useVault } from '@/hooks/use-vault';
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
import { Button, Overline, PressScale, ScreenHeader } from '@/components/ui';
import { success, tapLight } from '@/lib/haptics';
import { c, elevation, radius, space, type } from '@/theme';

const WHATSAPP_URL = 'https://wa.me/18765072163';
const BOOKED_HERO_H = 400;

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
  const { width } = useWindowDimensions();
  const bookedSize = Math.min(120, Math.floor((width - 40) / (6 * 0.72)));
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
  // The Vault item this clean is for (sent as pair_id, so repeat cleans build
  // one item's history instead of adding a new one). /book?pair=<id> comes
  // from "Book its next clean" on a Vault item.
  const features = useFeatures();
  const { pairs: vaultPairs } = useVault();
  const vaultOn = features.has('vault');
  const { pair: pairParam } = useLocalSearchParams<{ pair?: string }>();
  const [pairId, setPairId] = useState<string | null>(null);
  const [seenParam, setSeenParam] = useState<string | undefined>(undefined);
  const paramPair = vaultOn && pairParam ? vaultPairs.find((p) => p.id === pairParam) : undefined;
  if (paramPair && seenParam !== paramPair.id) {
    setSeenParam(paramPair.id);
    setPairId(paramPair.id);
    setShoeType(pairTitle(paramPair));
  }
  const chosenPair = pairId ? (vaultPairs.find((p) => p.id === pairId) ?? null) : null;
  const [submitting, setSubmitting] = useState(false);
  const [useCredit, setUseCredit] = useState(true);
  const { membership, reload: reloadMembership } = useMembership();
  const [error, setError] = useState<string | null>(null);
  // Guests fill in the whole booking, then sign in here at the last step.
  // This is a sheet over the Book screen (not a route change), so every
  // selection above stays in state through sign-in.
  const [signInOpen, setSignInOpen] = useState(false);

  // The booked screen sits on a navy hero: light status bar there only.
  useEffect(() => {
    setStatusBarStyle(step === 2 ? 'light' : 'dark');
    return () => setStatusBarStyle('dark');
  }, [step]);

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
  // Sole and suede extras only make sense for footwear: a cap gets the rest.
  const forHeadwear = serviceKind(selected?.name) === 'headwear';
  const pickable = addOns.filter((a) => a.kind !== 'delivery' && !(forHeadwear && /sole|suede/i.test(`${a.slug} ${a.name}`)));
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
  const headwear = forHeadwear;
  // Vault items this service can clean, shown as one-tap choices.
  const fitting = vaultOn && selected ? vaultPairs.filter((p) => pairFitsService(p.category, selected.name)) : [];

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
      pair_id: chosenPair?.id ?? null,
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
    setPairId(null);
    setNotes('');
    router.push('/');
  }

  if (step === 2) {
    const when = date ? `${date.short} ${date.num}`.toUpperCase() : '—';
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          {/* Navy hero: the one huge word, Creppie under a spotlight */}
          <View style={{ height: BOOKED_HERO_H, paddingTop: insets.top + space.md, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, overflow: 'hidden', backgroundColor: c.navy }}>
            <Svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height={BOOKED_HERO_H}>
              <Defs>
                <SvgGradient id="bsky" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#061329" />
                  <Stop offset="1" stopColor="#0E2A5C" />
                </SvgGradient>
                <RadialGradient id="bspot" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#1A6FD4" stopOpacity="0.6" />
                  <Stop offset="0.55" stopColor="#1A6FD4" stopOpacity="0.14" />
                  <Stop offset="1" stopColor="#1A6FD4" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width={width} height={BOOKED_HERO_H} fill="url(#bsky)" />
              <Ellipse cx={width / 2} cy={BOOKED_HERO_H * 0.66} rx={width * 0.6} ry={BOOKED_HERO_H * 0.4} fill="url(#bspot)" />
            </Svg>
            <Text style={[type.overline, { color: c.onNavyMuted, paddingHorizontal: space.lg }]}>
              {selected?.name ?? 'Clean Crep'} · {shoeType || (headwear ? 'Your cap' : 'Your pair')}
            </Text>
            <View style={{ flexDirection: 'row', paddingHorizontal: space.lg - 4, marginTop: space.xxs }} accessible accessibilityLabel="Booked">
              {'BOOKED'.split('').map((ch, i) => (
                <Animated.Text
                  key={i}
                  entering={FadeInDown.delay(60 + i * 50).springify().damping(13)}
                  style={{ fontFamily: type.display.fontFamily, fontSize: bookedSize, lineHeight: bookedSize * 1.02, letterSpacing: -bookedSize * 0.04, color: c.white }}
                >
                  {ch}
                </Animated.Text>
              ))}
            </View>
            <Animated.View entering={ZoomIn.delay(380).springify().damping(12)} style={{ position: 'absolute', left: 0, right: 0, bottom: 34, alignItems: 'center' }}>
              <CreppieArt mood="success" size={220} />
            </Animated.View>
          </View>

          {/* The ticket, straddling the hero edge */}
          <Animated.View entering={FadeInUp.delay(520).springify().damping(16)} style={{ paddingHorizontal: space.lg, marginTop: -44 }}>
            <View testID="booked-ticket" style={[{ backgroundColor: c.surface, borderRadius: radius.lg + 4, overflow: 'hidden' }, elevation.raised]}>
              <View style={{ padding: space.lg, gap: space.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.navy, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={18} color={c.white} strokeWidth={3} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={type.title}>You&apos;re booked.</Text>
                    <Text style={type.caption}>{MOODS.success.title}</Text>
                  </View>
                </View>
                <View style={{ marginTop: space.md }}>
                  <Text style={type.overline}>{dropoff ? 'Drop-off' : 'CrepRun collects'}</Text>
                  <Text style={[type.hero, { fontVariant: ['tabular-nums'] }]}>
                    {when} <Text style={[type.title, { color: c.inkMuted }]}>{date?.month}</Text>
                  </Text>
                </View>
                <Text style={[type.body, { color: c.inkMuted }]}>
                  {dropoff ? 'Shop 19, Pristine Plaza, Half Way Tree.' : `We collect from ${zone?.name ?? 'your area'} and bring them back clean.`}
                </Text>
              </View>

              <Perforation />

              <View style={{ padding: space.lg, gap: space.xs }}>
                {[
                  [headwear ? 'Cap' : 'Shoe', shoeType || '—'],
                  [dropoff ? 'Drop-off' : 'Collection', dropoff ? 'In-store drop-off' : `CrepRun pickup · ${zone?.name ?? ''}`],
                  [selected?.name ?? 'Service', selected ? formatPrice(selected.price_cents) : '—'],
                  ...charged.map((a) => [a.name, a.price_cents === null ? 'On inspection' : `+${formatPrice(a.price_cents)}`]),
                  ...(creditApplied && selected ? [[`Care credit${creditCost > 1 ? `s (${creditCost})` : ''}`, `−${formatPrice(selected.price_cents)}`]] : []),
                ].map(([k, v]) => (
                  <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
                    <Text style={[type.body, { color: c.inkMuted, flexShrink: 1 }]}>{k}</Text>
                    <Text style={[type.bodyStrong, { flexShrink: 1, textAlign: 'right' }]}>{v}</Text>
                  </View>
                ))}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: space.sm }}>
                  <Text style={type.overline}>Total</Text>
                  <Text style={[type.hero, { fontSize: 36, lineHeight: 40, fontVariant: ['tabular-nums'] }]}>{formatPrice(total)}</Text>
                </View>
                <Text style={type.caption}>
                  {dropoff ? 'Payment on drop-off.' : "We'll WhatsApp you on collection day."} Cash & transfer accepted.
                  {hasKit ? (dropoff ? ' Kits are paid for and collected at the shop.' : ' Kits are settled with your order.') : ''}
                </Text>
              </View>
            </View>
          </Animated.View>

          <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.sm }}>
            <PushOffer />
            <Button variant="dark" label="Back to Home" onPress={resetAndGoHome} />
            <Button variant="secondary" label="Link Us on WhatsApp" icon={<Icon name="wa" size={18} color={c.navy} />} onPress={() => Linking.openURL(WHATSAPP_URL)} />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (step === 1 && selected) {
    let n = 0;
    const num = () => String(++n).padStart(2, '0');
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
          <ScreenHeader
            title="Booking Details"
            subtitle={`${selected.name} · ${formatPrice(selected.price_cents)}${selected.price_cents === null ? ' on inspection' : ''}`}
            left={
              <Pressable onPress={() => setStep(0)} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
                <Icon name="chevronL" size={20} color={c.navy} />
              </Pressable>
            }
            right={<Text style={type.overline}>Step 1 of 2</Text>}
          />
          <View style={{ paddingHorizontal: space.lg, gap: space.xl }}>
            <View>
              <Label n={num()}>{headwear ? 'YOUR CAP' : 'YOUR PAIR'}</Label>
              {fitting.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginBottom: space.sm }}>
                  {fitting.map((p) => {
                    const on = p.id === chosenPair?.id;
                    return (
                      <Pressable
                        key={p.id}
                        testID="vault-choice"
                        onPress={() => {
                          tapLight();
                          setPairId(on ? null : p.id);
                          setShoeType(on ? '' : pairTitle(p));
                        }}
                        accessibilityRole="radio"
                        aria-checked={on}
                        style={[
                          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: space.xs, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: on ? c.navy : c.surface },
                          on ? null : elevation.card,
                        ]}
                      >
                        {on && <Icon name="check" size={14} color={c.white} strokeWidth={3} />}
                        <Text style={[type.bodyStrong, { fontSize: 14, color: on ? c.white : c.ink }]}>{pairTitle(p)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              <TextInput
                value={shoeType}
                onChangeText={(t) => {
                  setShoeType(t);
                  // Typing something else means a different item than the Vault one.
                  if (chosenPair && t !== pairTitle(chosenPair)) setPairId(null);
                }}
                placeholder={headwear ? 'e.g. New Era 59FIFTY, Nike dad cap' : 'e.g. Nike Air Force 1, Clarks Desert Boot'}
                placeholderTextColor={c.inkMuted}
                style={inputStyle}
              />
            </View>

            <View>
              <Label n={num()}>HOW THEY GET TO US</Label>
              <View style={[{ flexDirection: 'row', backgroundColor: c.surface, borderRadius: radius.pill, padding: 4 }, elevation.card]}>
                {[
                  { label: 'Drop Off', val: true, icon: 'pkg' as const },
                  { label: 'Pickup', val: false, icon: 'truck' as const },
                ].map((opt) => {
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
                      style={{ flex: 1, minHeight: 48, borderRadius: radius.pill, flexDirection: 'row', gap: space.xs, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.navy : 'transparent' }}
                    >
                      <Icon name={opt.icon} size={17} color={on ? c.white : c.inkMuted} />
                      <Text style={[on ? type.bodyStrong : type.body, { color: on ? c.white : c.inkMuted }]}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[type.caption, { marginTop: space.xs }]}>
                {dropoff ? 'Shop 19, Pristine Plaza, Half Way Tree. Closed Sundays.' : 'CrepRun collects from your area and brings them back clean.'}
              </Text>
            </View>

            {!dropoff && (
              <View>
                <Label n={num()}>YOUR AREA · CREPRUN</Label>
                {zones.length === 0 ? (
                  <Text style={[type.body, { color: c.inkMuted }]}>Couldn&apos;t load pickup areas. Message us on WhatsApp to arrange pickup.</Text>
                ) : (
                  <View style={{ gap: space.xs }}>
                    {zones.map((z) => (
                      <ZoneRow key={z.id} zone={z} on={z.id === zoneId} onPress={() => selectZone(z)} />
                    ))}
                    <Text style={type.caption}>Area not listed? Message us on WhatsApp.</Text>
                  </View>
                )}
                {pickupDay && (
                  <View style={{ marginTop: space.sm, backgroundColor: c.navy, borderRadius: radius.lg, padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <Icon name="truck" size={18} color={c.onNavyMuted} />
                    <Text style={[type.body, { color: c.white, flex: 1 }]}>
                      CrepRun collects on{' '}
                      <Text style={{ fontFamily: type.bodyStrong.fontFamily }}>
                        {pickupDay.short} {pickupDay.num} {pickupDay.month}
                      </Text>
                    </Text>
                  </View>
                )}
              </View>
            )}

            {dropoff && (
              <View>
                <Label n={num()}>WHEN</Label>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ gap: space.xs, paddingHorizontal: space.lg, paddingVertical: space.xs }}>
                  {days.map((d, i) => {
                    const on = selDay === i;
                    return (
                      <Pressable
                        key={i}
                        onPress={() => {
                          if (!on) tapLight();
                          setSelDay(i);
                        }}
                        accessibilityRole="radio"
                        aria-checked={on}
                        style={[{ width: 64, alignItems: 'center', paddingVertical: space.sm, borderRadius: radius.lg, backgroundColor: on ? c.navy : c.surface }, on ? elevation.raised : elevation.card]}
                      >
                        <Text style={[type.caption, { color: on ? c.onNavyMuted : c.inkMuted }]}>{d.short}</Text>
                        <Text style={[type.title, { fontVariant: ['tabular-nums'], color: on ? c.white : c.navy }]}>{d.num}</Text>
                        <Text style={[type.caption, { fontSize: 11, color: on ? c.onNavyMuted : c.inkMuted }]}>{d.month}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {pickable.length > 0 && (
              <View>
                <Label n={num()}>LEVEL IT UP</Label>
                <View style={{ gap: space.xs }}>
                  {pickable.map((a) => (
                    <AddOnRow key={a.id} addOn={a} on={picked.includes(a.id)} onPress={() => togglePick(a.id)} />
                  ))}
                </View>
                {hasKit && (
                  <Text style={[type.caption, { marginTop: space.xs }]}>
                    {dropoff
                      ? "Kits are paid for and collected at the shop. We'll confirm stock when you drop off."
                      : "We'll confirm stock before CrepRun collects and settle the kit with your order."}
                  </Text>
                )}
              </View>
            )}

            <View>
              <Label n={num()}>NOTES (OPTIONAL)</Label>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder={headwear ? 'Any special instructions for your cap…' : 'Any special instructions for your pair…'}
                placeholderTextColor={c.inkMuted}
                multiline
                numberOfLines={3}
                style={[inputStyle, { minHeight: 96, textAlignVertical: 'top' }]}
              />
            </View>

            {canUseCredit && membership && (
              <Pressable
                testID="use-credit"
                onPress={() => setUseCredit((v) => !v)}
                accessibilityRole="checkbox"
                aria-checked={useCredit}
                style={[{ flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: useCredit ? c.navy : c.surface }, useCredit ? elevation.raised : elevation.card]}
              >
                <Tick on={useCredit} dark />
                <View style={{ flex: 1 }}>
                  <Text style={[type.bodyStrong, { color: useCredit ? c.white : c.ink }]}>
                    Use {creditCost} care credit{creditCost > 1 ? 's' : ''}
                  </Text>
                  <Text style={[type.caption, { color: useCredit ? c.onNavyMuted : c.inkMuted }]}>
                    Covers the {formatPrice(selected?.price_cents ?? null)} clean · {membership.balance} left on {membership.plan.name}
                  </Text>
                </View>
              </Pressable>
            )}

            {/* Receipt + the one primary action */}
            <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg + 4, padding: space.lg, gap: space.xs }, elevation.card]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
                <Text style={[type.body, { color: c.inkMuted }]}>{selected.name}</Text>
                <Text style={type.bodyStrong}>{formatPrice(selected.price_cents)}</Text>
              </View>
              {charged.map((a) => (
                <View key={a.name} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
                  <Text style={[type.body, { color: c.inkMuted, flexShrink: 1 }]}>{a.name}</Text>
                  <Text style={type.bodyStrong}>{a.price_cents === null ? 'On inspection' : `+${formatPrice(a.price_cents)}`}</Text>
                </View>
              ))}
              {creditApplied && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
                  <Text style={[type.body, { color: c.inkMuted }]}>Care credit{creditCost > 1 ? `s (${creditCost})` : ''}</Text>
                  <Text style={type.bodyStrong}>−{formatPrice(selected.price_cents)}</Text>
                </View>
              )}
              <View style={{ height: 1, backgroundColor: c.line, marginVertical: space.xs }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={type.overline}>TOTAL</Text>
                <Text style={[type.hero, { fontSize: 40, lineHeight: 44, fontVariant: ['tabular-nums'] }]}>{formatPrice(total)}</Text>
              </View>

              {error && (
                <View style={{ gap: space.xs, marginTop: space.xs }}>
                  <Text style={[type.body, { color: c.danger }]}>{error}</Text>
                  <Pressable onPress={() => Linking.openURL(WHATSAPP_URL)}>
                    <Text style={[type.bodyStrong, { color: c.accent }]}>Message us on WhatsApp</Text>
                  </Pressable>
                </View>
              )}

              <PressScale
                testID="confirm-booking"
                onPress={() => {
                  if (submitting) return;
                  tapLight();
                  confirmBooking();
                }}
                style={{
                  marginTop: space.sm,
                  height: 60,
                  borderRadius: radius.pill,
                  backgroundColor: c.accent,
                  opacity: submitting ? 0.6 : 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingLeft: space.lg,
                  paddingRight: 6,
                  boxShadow: '0 14px 30px rgba(26,111,212,0.3), 0 2px 6px rgba(10,31,68,0.16)',
                }}
              >
                <Text style={[type.button, { color: c.white }]}>{submitting ? 'Booking…' : 'Confirm Booking'}</Text>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.white, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="arrowR" size={20} color={c.accent} strokeWidth={2} />
                </View>
              </PressScale>
              {!session && (
                <Text style={[type.caption, { textAlign: 'center', marginTop: space.xs }]}>You&apos;ll sign in or create an account to confirm. Your details stay filled in.</Text>
              )}
            </View>
          </View>
        </ScrollView>

        <Modal visible={signInOpen} animationType="slide" transparent onRequestClose={() => setSignInOpen(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,31,68,0.55)' }}>
            <View style={{ paddingBottom: insets.bottom, backgroundColor: c.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32 }}>
              <ScrollView contentContainerStyle={{ padding: space.lg }} keyboardShouldPersistTaps="handled">
                <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.line, marginBottom: space.md }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md }}>
                  <Text style={type.headline}>One last step</Text>
                  <Pressable onPress={() => setSignInOpen(false)} hitSlop={12}>
                    <Text style={[type.bodyStrong, { color: c.inkMuted }]}>Cancel</Text>
                  </Pressable>
                </View>
                <SignInForm
                  bare
                  subtitle={`Sign in to confirm your ${selected.name}. We'll use this to send you updates on your ${headwear ? 'cap' : 'pair'}.`}
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

  // Footwear first, then caps & hats under their own heading; numbered straight through.
  // Booking for a Vault item: only the services that can clean it.
  const offered = chosenPair ? services.filter((x) => pairFitsService(chosenPair.category, x.name)) : services;
  const ordered = [...offered.filter((x) => serviceKind(x.name) === 'footwear'), ...offered.filter((x) => serviceKind(x.name) === 'headwear')];
  const menu = ordered.map((svc, i) => ({ svc, i, groupStart: i > 0 && serviceKind(svc.name) === 'headwear' && serviceKind(ordered[i - 1].name) !== 'headwear' }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScreenHeader title="Book" subtitle="Pick a service. We handle the rest." />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: space.xs, paddingBottom: 140, gap: space.md }}>
        {chosenPair && (
          <View testID="booking-for" style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: c.navy, borderRadius: radius.lg, padding: space.md }}>
            <Icon name="vault" size={18} color={c.onNavyMuted} />
            <View style={{ flex: 1 }}>
              <Text style={[type.overline, { color: c.onNavyMuted }]}>Booking for</Text>
              <Text style={[type.bodyStrong, { color: c.white }]}>{pairTitle(chosenPair)}</Text>
            </View>
            <Pressable
              onPress={() => {
                setPairId(null);
                setShoeType('');
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Book something else"
            >
              <Text style={[type.bodyStrong, { color: c.onNavyMuted }]}>Change</Text>
            </Pressable>
          </View>
        )}
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
        {menu.map(({ svc, i, groupStart }) => (
          <View key={svc.id} style={{ gap: space.sm }}>
            {groupStart && <Overline style={{ marginTop: space.md }}>CAPS & HATS</Overline>}
            <PressScale
              testID="service-card"
              onPress={() => {
                setSelected(svc);
                if (chosenPair && !pairFitsService(chosenPair.category, svc.name)) {
                  setPairId(null);
                  setShoeType('');
                }
                setStep(1);
                track('booking_started', { service: svc.name, platform: 'app' });
              }}
              style={[{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.lg, gap: space.xs }, elevation.card]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xxs }}>
                <Text style={[type.overline, { fontVariant: ['tabular-nums'] }]}>{String(i + 1).padStart(2, '0')}</Text>
                {svc.popular && (
                  <View style={{ backgroundColor: c.navy, borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: space.sm }}>
                    <Text style={[type.overline, { color: c.white, fontSize: 10, letterSpacing: 1.2 }]}>MOST POPULAR</Text>
                  </View>
                )}
              </View>
              <Text style={type.title}>{svc.name}</Text>
              <Text style={[type.body, { color: c.inkMuted }]} numberOfLines={2}>
                {svc.description}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.xs }}>
                  <Text style={type.priceLg}>{formatPrice(svc.price_cents)}</Text>
                  <Text style={type.caption}>{svc.note}</Text>
                </View>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="arrowR" size={20} color={c.white} />
                </View>
              </View>
            </PressScale>

          </View>
        ))}
        {services.length > 0 && (
          <View style={{ marginTop: space.sm }}>
            <CreppieButton inline />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Ticket tear line with a notch cut out of each side. */
function Perforation() {
  return (
    <View style={{ height: 24, justifyContent: 'center' }}>
      <View style={{ position: 'absolute', left: -12, width: 24, height: 24, borderRadius: 12, backgroundColor: c.bg }} />
      <View style={{ position: 'absolute', right: -12, width: 24, height: 24, borderRadius: 12, backgroundColor: c.bg }} />
      <View style={{ marginHorizontal: space.lg, borderTopWidth: 1.5, borderColor: c.line, borderStyle: 'dashed' }} />
    </View>
  );
}

/** Round tick: navy when on (white on a navy card). */
function Tick({ on, dark }: { on: boolean; dark?: boolean }) {
  const fill = dark && on ? c.white : c.navy;
  return (
    <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: on ? fill : c.line, backgroundColor: on ? fill : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      {on && <Icon name="check" size={14} color={dark ? c.navy : c.white} strokeWidth={3} />}
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
        { backgroundColor: c.surface, borderRadius: radius.lg, padding: space.md, flexDirection: 'row', gap: space.sm, alignItems: 'center', borderWidth: 1.5, borderColor: on ? c.navy : 'transparent' },
        on ? null : elevation.card,
      ]}
    >
      <Tick on={on} />
      <View style={{ flex: 1 }}>
        <Text style={type.bodyStrong}>
          {zone.name} · {zone.pickup_day}s
        </Text>
        <Text style={[type.caption, { marginTop: 2 }]}>{zone.areas}</Text>
      </View>
      <Text style={[type.bodyStrong, { fontVariant: ['tabular-nums'] }]}>+{formatPrice(zone.rate_cents)}</Text>
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
        { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: c.surface, borderRadius: radius.lg, padding: space.md, borderWidth: 1.5, borderColor: on ? c.navy : 'transparent' },
        on ? null : elevation.card,
      ]}
    >
      <Tick on={on} />
      <View style={{ flex: 1 }}>
        <Text style={type.bodyStrong}>
          {addOn.name}
          {addOn.kind === 'kit' ? '  ·  Kit' : ''}
        </Text>
        {!!addOn.description && <Text style={[type.caption, { marginTop: 2 }]}>{addOn.description}</Text>}
      </View>
      <Text style={[type.bodyStrong, { fontVariant: ['tabular-nums'] }]}>{addOn.price_cents === null ? 'Quote' : `+${formatPrice(addOn.price_cents)}`}</Text>
    </Pressable>
  );
}

/** Numbered section label: "01  YOUR PAIR". */
function Label({ n, children }: { n: string; children: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginBottom: space.sm }}>
      <Text style={[type.overline, { color: c.ink, fontVariant: ['tabular-nums'] }]}>{n}</Text>
      <Overline>{children}</Overline>
    </View>
  );
}

const inputStyle: TextStyle = {
  borderWidth: 1.5,
  borderColor: 'transparent',
  borderRadius: radius.lg,
  minHeight: 56,
  boxShadow: elevation.card.boxShadow as string,
  paddingVertical: space.sm,
  paddingHorizontal: space.md,
  fontFamily: type.body.fontFamily,
  fontSize: type.body.fontSize,
  color: c.navy,
  backgroundColor: c.surface,
};
