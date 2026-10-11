import { Text, View } from 'react-native';
import { fontFamily, statusLabel, type DropMethod, type OrderStatus } from '@clean-crep/shared';
import { c, radius, space } from '@/theme';

// Pills are navy, white and ice only: blue means "tap this" (DESIGN.md §8) and
// a status isn't tappable. Ready is the loud one (solid navy, or white on the
// navy ticket); everything else is quiet. `onDark` is for the navy order ticket.
export function StatusTag({ status, method, onDark }: { status: OrderStatus; method?: DropMethod | null; onDark?: boolean }) {
  const ready = status === 'ready_for_pickup';
  const bg = ready ? (onDark ? c.white : c.navy) : onDark ? 'rgba(255,255,255,0.14)' : c.ice;
  const fg = ready ? (onDark ? c.navy : c.white) : onDark ? c.white : c.navy;
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.pill, paddingVertical: space.xxs, paddingHorizontal: space.sm, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 13, lineHeight: 18, fontFamily: fontFamily.medium, color: fg }}>{statusLabel(status, method)}</Text>
    </View>
  );
}
