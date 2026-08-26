'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, DollarSign, Package, Clock as ClockIcon, Search, Truck } from 'lucide-react';
import {
  colors,
  formatPrice,
  DASHBOARD_STATUS_FLOW,
  ORDER_STATUS_LABEL,
  type Order,
  type OrderStatus,
  type Service,
} from '@clean-crep/shared';
import { StatusTag } from '@/components/status-tag';
import { WhatsAppIcon } from '@/components/whatsapp-icon';
import { createClient } from '@/lib/supabase/client';

interface OrderRow extends Order {
  service: Service;
  customer: { name: string; phone: string | null };
}

const td: React.CSSProperties = { padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, verticalAlign: 'middle' };

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [filter, setFilter] = useState<OrderStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, service:services(*), customer:customers(name, phone)')
      .order('created_at', { ascending: false });
    setOrders((data ?? []) as unknown as OrderRow[]);
  }, [supabase]);

  useEffect(() => {
    // Initial fetch, then subscribe to live updates below — both funnel
    // through the same `reload`, which is why it's flagged as "setState in
    // effect": that's the intended one-shot-fetch-then-subscribe pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    const channel = supabase
      .channel('dashboard-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => reload())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, reload]);

  async function handleStatusChange(id: string, status: OrderStatus) {
    await supabase.from('orders').update({ status }).eq('id', id);
    setExpanded(null);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/staff/login');
    router.refresh();
  }

  const filtered = orders.filter((o) => {
    const matchFilter = filter === 'All' || o.status === filter;
    const q = search.toLowerCase();
    const matchSearch =
      !q || o.order_number.toLowerCase().includes(q) || o.item_name.toLowerCase().includes(q) || o.customer?.name?.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const revenue = orders
    .filter((o) => o.status === 'completed')
    .reduce((sum, o) => sum + (o.price_cents ?? 0), 0);
  const inProgress = orders.filter((o) => o.status === 'in_progress').length;
  const readyForPickup = orders.filter((o) => o.status === 'ready_for_pickup').length;

  return (
    <div style={{ minHeight: '100vh', background: colors.offWhite, fontFamily: 'inherit' }}>
      <div style={{ background: colors.navy, height: 56, display: 'flex', alignItems: 'center', padding: '0 32px', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <Image src="/assets/logo-cropped.png" alt="Clean Crep" width={30} height={30} style={{ borderRadius: '50%', objectFit: 'cover' }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: colors.white }}>Clean Crep JA</span>
        <span style={{ fontSize: 11, color: 'rgba(168,200,240,0.6)', marginLeft: 2 }}>· Operator Dashboard</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, color: colors.softBlue }}>Shop 19 · Pristine Plaza, HWT</span>
          <a
            href="https://wa.me/18765072163"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#25D366', color: '#fff', borderRadius: 7, padding: '6px 14px', fontSize: 11, fontWeight: 500, textDecoration: 'none' }}
          >
            <WhatsAppIcon size={13} /> WhatsApp
          </a>
          <button
            onClick={handleSignOut}
            style={{ width: 30, height: 30, borderRadius: '50%', background: colors.blue, border: 'none', cursor: 'pointer', color: colors.white, fontSize: 11, fontWeight: 600 }}
            title="Sign out"
          >
            CC
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          <MetricCard label="Total Orders" value={String(orders.length)} sub="All time" icon={<Package size={16} color={colors.blue} />} />
          <MetricCard label="Revenue" value={formatPrice(revenue)} sub="JMD · Completed" icon={<DollarSign size={16} color={colors.blue} />} />
          <MetricCard label="In Progress" value={String(inProgress)} sub="Being cleaned" icon={<ClockIcon size={16} color="#B45309" />} iconBg="#FEF3C7" />
          <MetricCard label="Ready for Pickup" value={String(readyForPickup)} sub="Waiting at shop" icon={<Truck size={16} color="#16A34A" />} iconBg="#DCFCE7" />
        </div>

        <div style={{ background: colors.white, borderRadius: 14, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: colors.navy, marginRight: 4 }}>Orders</div>

            <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 260 }}>
              <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <Search size={14} color={colors.caption} />
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order, item, customer…"
                style={{
                  width: '100%',
                  paddingLeft: 32,
                  paddingRight: 12,
                  height: 34,
                  borderRadius: 7,
                  border: `1px solid ${colors.border}`,
                  fontSize: 12,
                  color: colors.charcoal,
                  background: colors.offWhite,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginLeft: 'auto' }}>
              {(['All', ...DASHBOARD_STATUS_FLOW] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    borderRadius: 20,
                    padding: '4px 12px',
                    cursor: 'pointer',
                    border: 'none',
                    background: filter === f ? colors.navy : colors.ice,
                    color: filter === f ? colors.white : colors.caption,
                  }}
                >
                  {f === 'All' ? 'All' : ORDER_STATUS_LABEL[f]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead>
                <tr style={{ background: colors.offWhite }}>
                  {['Order ID', 'Item / Customer', 'Service', 'Status', 'Price', 'Dropped', ''].map((h) => (
                    <th key={h} style={{ ...td, fontSize: 9, fontWeight: 500, color: colors.caption, textTransform: 'uppercase', letterSpacing: 1.5, textAlign: 'left' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <OrderRowView
                    key={order.id}
                    order={order}
                    isExpanded={expanded === order.id}
                    onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: colors.caption, fontSize: 13 }}>No orders found.</div>}
          </div>

          <div style={{ padding: '12px 20px', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: colors.caption }}>
              {filtered.length} of {orders.length} orders
            </span>
            <Link href="/" style={{ fontSize: 11, color: colors.blue, textDecoration: 'none', fontWeight: 500 }}>
              ← Back to Site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, icon, iconBg }: { label: string; value: string; sub: string; icon: React.ReactNode; iconBg?: string }) {
  return (
    <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, padding: '18px 20px' }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: iconBg ?? colors.ice, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        {icon}
      </div>
      <div style={{ fontSize: 9, fontWeight: 500, color: colors.caption, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 500, color: colors.navy, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: colors.caption }}>{sub}</div>
    </div>
  );
}

function OrderRowView({
  order,
  isExpanded,
  onToggle,
  onStatusChange,
}: {
  order: OrderRow;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusChange: (id: string, status: OrderStatus) => void;
}) {
  const phoneDigits = (order.customer?.phone ?? '').replace(/\D/g, '');
  const waPhone = phoneDigits ? (phoneDigits.startsWith('1') ? phoneDigits : `1${phoneDigits}`) : '';
  const notifyText = encodeURIComponent(
    `Hi ${order.customer?.name ?? ''}, your ${order.item_name} order (${order.order_number}) is now: ${ORDER_STATUS_LABEL[order.status]}`
  );

  return (
    <>
      <tr onClick={onToggle} style={{ cursor: 'pointer', background: isExpanded ? colors.ice : 'transparent' }}>
        <td style={td}>
          <span style={{ fontSize: 11, fontWeight: 500, color: colors.blue }}>{order.order_number}</span>
        </td>
        <td style={td}>
          <div style={{ fontSize: 12, fontWeight: 500, color: colors.navy }}>{order.item_name}</div>
          <div style={{ fontSize: 10, color: colors.caption, marginTop: 2 }}>{order.customer?.name}</div>
        </td>
        <td style={td}>
          <span style={{ fontSize: 11, color: colors.charcoal }}>{order.service?.name}</span>
        </td>
        <td style={td}>
          <StatusTag status={order.status} />
        </td>
        <td style={td}>
          <span style={{ fontSize: 12, fontWeight: 500, color: colors.navy }}>{formatPrice(order.price_cents)}</span>
        </td>
        <td style={td}>
          <span style={{ fontSize: 10, color: colors.caption }}>{new Date(order.created_at).toLocaleDateString('en-JM', { month: 'short', day: 'numeric' })}</span>
        </td>
        <td style={td}>
          <div style={{ display: 'inline-flex', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>
            <ChevronRight size={14} color={colors.caption} />
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr style={{ background: colors.ice }}>
          <td colSpan={7} style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 9, color: colors.caption, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 500, marginBottom: 4 }}>CONTACT</div>
                <div style={{ fontSize: 11, color: colors.navy }}>{order.customer?.phone ?? '—'}</div>
              </div>
              <div style={{ width: 1, height: 32, background: colors.border }} />
              <div>
                <div style={{ fontSize: 9, color: colors.caption, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 500, marginBottom: 6 }}>UPDATE STATUS</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {DASHBOARD_STATUS_FLOW.map((s) => (
                    <button
                      key={s}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(order.id, s);
                      }}
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        borderRadius: 6,
                        padding: '5px 12px',
                        cursor: 'pointer',
                        border: `1px solid ${order.status === s ? colors.blue : colors.border}`,
                        background: order.status === s ? colors.blue : colors.white,
                        color: order.status === s ? colors.white : colors.charcoal,
                      }}
                    >
                      {ORDER_STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <a
                  href={waPhone ? `https://wa.me/${waPhone}?text=${notifyText}` : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (!waPhone) e.preventDefault();
                    e.stopPropagation();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: waPhone ? '#25D366' : colors.border,
                    color: '#fff',
                    borderRadius: 7,
                    padding: '7px 14px',
                    fontSize: 11,
                    fontWeight: 500,
                    textDecoration: 'none',
                  }}
                >
                  <WhatsAppIcon size={13} /> Notify Customer
                </a>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
