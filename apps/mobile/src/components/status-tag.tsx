import { Text, View } from 'react-native';
import { fontFamily, statusLabel, type DropMethod, type OrderStatus } from '@clean-crep/shared';
import { c, radius, space } from '@/theme';

// Pills use only navy, white and the accent (DESIGN.md §7). `onDark` is for
// the navy order ticket.
export function StatusTag({ status, method, onDark }: { status: OrderStatus; method?: DropMethod | null; onDark?: boolean }) {
  const done = status === 'completed';
  const ready = status === 'ready_for_pickup';
  const bg = done || ready ? c.accent : onDark ? 'rgba(255,255,255,0.14)' : c.ice;
  const fg = done || ready || onDark ? c.white : c.navy;
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.pill, paddingVertical: space.xxs, paddingHorizontal: space.sm, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 13, lineHeight: 18, fontFamily: fontFamily.medium, color: fg }}>{statusLabel(status, method)}</Text>
    </View>
  );
}
