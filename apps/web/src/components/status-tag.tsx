import { ORDER_STATUS_LABEL, STATUS_STYLES, type OrderStatus } from '@clean-crep/shared';

export function StatusTag({ status }: { status: OrderStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className="tag" style={{ background: s.bg, color: s.fg, whiteSpace: 'nowrap' }}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
