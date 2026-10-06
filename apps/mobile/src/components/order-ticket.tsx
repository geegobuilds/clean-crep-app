import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { fontFamily, TRACKER_STEPS, stepFromStatus, type OrderStatus } from '@clean-crep/shared';
import { Icon } from '@/components/icon';
import { StatusTag } from '@/components/status-tag';
import type { OrderWithService } from '@/hooks/use-orders';
import { c, elevation, radius, space, spring, type } from '@/theme';

// The order as a boarding pass (DESIGN.md §7): navy ticket, drop-off → ready
// days as the "route", a perforated stub with the order details, and a status
// timeline that springs to the current step.

const NOTCH = 22;

/** Local date from an ISO day (no UTC shift). */
function day(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T12:00:00`);
}

/** Drop-off/collection day + the service's turnaround in shop days (closed Sundays). */
export function readyBy(order: OrderWithService): Date {
  const d = day(order.scheduled_date);
  let left = order.service?.turnaround_days ?? 2;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) left--;
  }
  return d;
}

function dayCode(d: Date) {
  return {
    week: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    num: String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleDateString('en-US', { month: 'short' }),
  };
}

/** Short enough for a quarter of the ticket: "2:14pm" today, else "Sat 3". */
function stamp(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (d.toDateString() === new Date().toDateString()) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase();
  }
  return `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getDate()}`;
}

export function OrderTicket({ order }: { order: OrderWithService }) {
  const pickup = order.drop_method === 'pickup';
  const from = dayCode(day(order.scheduled_date));
  const to = dayCode(readyBy(order));
  const extras = (order.add_ons ?? []).map((a) => a.name);

  return (
    <View testID="order-ticket" style={[{ backgroundColor: c.navy, borderRadius: radius.lg }, elevation.raised]}>
      {/* Header + route */}
      <View style={{ padding: space.lg, paddingBottom: space.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[type.overline, { color: c.onNavyMuted }]}>Clean Crep · {order.order_number}</Text>
          <StatusTag status={order.status} onDark />
        </View>
        <Text style={[type.title, { color: c.white, marginTop: space.sm }]} numberOfLines={2}>
          {order.item_name}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.lg }}>
          <RouteEnd label={pickup ? 'CrepRun pickup' : 'Drop-off'} code={from} />
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm }}>
            <View style={{ flex: 1, height: 1, backgroundColor: c.onNavyLine }} />
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', marginHorizontal: space.xs }}>
              <Icon name="arrowR" size={16} color={c.white} strokeWidth={2.25} />
            </View>
            <View style={{ flex: 1, height: 1, backgroundColor: c.onNavyLine }} />
          </View>
          <RouteEnd label={pickup ? 'Back to you' : 'Ready by'} code={to} align="right" />
        </View>
      </View>

      <Perforation />

      {/* Stub */}
      <View style={{ padding: space.lg, paddingTop: space.md, gap: space.md }}>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <StubField label="Order" value={order.order_number} />
          <StubField label="Service" value={order.service?.name ?? order.item_name} flex={2} />
        </View>
        <StubField label="Add-ons" value={extras.length ? extras.join(' · ') : 'None'} />
        <StatusTimeline status={order.status} events={order.events ?? []} />
      </View>
    </View>
  );
}

function RouteEnd({ label, code, align = 'left' }: { label: string; code: ReturnType<typeof dayCode>; align?: 'left' | 'right' }) {
  return (
    <View style={{ alignItems: align === 'left' ? 'flex-start' : 'flex-end' }}>
      <Text style={[type.overline, { color: c.onNavyMuted }]}>{label}</Text>
      <Text style={{ fontFamily: fontFamily.display, fontSize: 30, lineHeight: 34, color: c.white, marginTop: space.xxs, fontVariant: ['tabular-nums'] }}>
        {code.week} {code.num}
      </Text>
      <Text style={[type.caption, { color: c.onNavyMuted }]}>{code.month}</Text>
    </View>
  );
}

function StubField({ label, value, flex = 1 }: { label: string; value: string; flex?: number }) {
  return (
    <View style={{ flex }}>
      <Text style={[type.overline, { color: c.onNavyMuted }]}>{label}</Text>
      <Text style={[type.bodyStrong, { color: c.white, marginTop: 2 }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

/** Tear line with page-coloured notches, like a real ticket stub. */
function Perforation() {
  return (
    <View style={{ height: NOTCH, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: NOTCH, height: NOTCH, borderRadius: NOTCH / 2, backgroundColor: c.bg, marginLeft: -NOTCH / 2 }} />
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.xs, overflow: 'hidden' }}>
        {Array.from({ length: 26 }).map((_, i) => (
          <View key={i} style={{ width: 6, height: 1.5, borderRadius: 1, backgroundColor: c.onNavyLine }} />
        ))}
      </View>
      <View style={{ width: NOTCH, height: NOTCH, borderRadius: NOTCH / 2, backgroundColor: c.bg, marginRight: -NOTCH / 2 }} />
    </View>
  );
}

const DOT = 22;

/**
 * Four steps; the filled track springs to the current one, and the current
 * dot pulses. Re-animates whenever the status changes (e.g. live to Ready).
 */
export function StatusTimeline({ status, events }: { status: OrderStatus; events: { status: OrderStatus; created_at: string }[] }) {
  const step = stepFromStatus(status); // 0..4
  const [trackW, setTrackW] = useState(0);
  const fill = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    const target = trackW * Math.max(0, Math.min((step - 1) / (TRACKER_STEPS.length - 1), 1));
    fill.value = withDelay(150, withSpring(target, spring));
  }, [step, trackW, fill]);

  useEffect(() => {
    pulse.value = 0;
    pulse.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false);
  }, [step, pulse]);

  const fillStyle = useAnimatedStyle(() => ({ width: fill.value }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.9 }],
  }));

  const timeFor = (label: number) => {
    const map: OrderStatus[] = ['received', 'in_progress', 'ready_for_pickup', 'completed'];
    return stamp(events.filter((e) => e.status === map[label]).slice(-1)[0]?.created_at);
  };

  return (
    <View testID="status-timeline" accessibilityLabel={`Status: step ${step} of ${TRACKER_STEPS.length}`} style={{ marginTop: space.xs }}>
      <View style={{ height: DOT, justifyContent: 'center', marginHorizontal: `${50 / TRACKER_STEPS.length}%` }}>
        <View onLayout={(e) => setTrackW(e.nativeEvent.layout.width)} style={{ height: 2, borderRadius: 1, backgroundColor: c.onNavyLine }} />
        <Animated.View style={[{ position: 'absolute', left: 0, height: 2, borderRadius: 1, backgroundColor: c.accent }, fillStyle]} />
      </View>
      <View style={{ flexDirection: 'row', marginTop: -DOT }}>
        {TRACKER_STEPS.map((label, i) => {
          // Completed = every step ticked, nothing left pulsing.
          const finished = status === 'completed';
          const done = i < step - 1 || (finished && i === step - 1);
          const cur = !finished && i === step - 1;
          return (
            <View key={label} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ width: DOT, height: DOT, alignItems: 'center', justifyContent: 'center' }}>
                {cur && (
                  <Animated.View
                    style={[{ position: 'absolute', width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: c.accent }, pulseStyle]}
                  />
                )}
                <View
                  style={{
                    width: DOT,
                    height: DOT,
                    borderRadius: DOT / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: done ? c.white : cur ? c.accent : c.navy,
                    borderWidth: done || cur ? 0 : 1.5,
                    borderColor: c.onNavyLine,
                  }}
                >
                  {done && <Icon name="check" size={13} color={c.navy} strokeWidth={3} />}
                  {cur && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.white }} />}
                </View>
              </View>
              <Text
                style={[type.caption, { marginTop: space.xs, textAlign: 'center', color: cur || done ? c.white : c.onNavyMuted, fontFamily: cur ? fontFamily.medium : fontFamily.regular }]}
              >
                {label}
              </Text>
              {!!timeFor(i) && (done || cur) && (
                <Text style={[type.caption, { color: c.onNavyMuted, marginTop: 2 }]}>{timeFor(i)}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
