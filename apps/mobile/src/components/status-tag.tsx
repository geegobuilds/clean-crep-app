import { Text, View } from 'react-native';
import { ORDER_STATUS_LABEL, STATUS_STYLES, type OrderStatus } from '@clean-crep/shared';

export function StatusTag({ status }: { status: OrderStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: 4, paddingVertical: 3, paddingHorizontal: 8, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 10, fontFamily: 'DMSans_500Medium', color: s.fg }}>
        {ORDER_STATUS_LABEL[status]}
      </Text>
    </View>
  );
}
