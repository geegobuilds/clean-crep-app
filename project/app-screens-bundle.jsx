// Clean Crep JA — App Screens
// All 4 screens: Home, Booking, Order Tracker, Profile

const { useState, useEffect } = React;

// ── Tokens ────────────────────────────────────────────────────
const C = {
  navy:     '#0A1F44',
  blue:     '#1A6FD4',
  blueHov:  '#155CB8',
  navyHov:  '#061329',
  charcoal: '#2A2D35',
  offWhite: '#F5F7FA',
  ice:      '#E8F1FB',
  softBlue: '#A8C8F0',
  caption:  '#5A6A8A',
  border:   '#E0E8F4',
  white:    '#FFFFFF',
};

const font = "'DM Sans', 'Inter', sans-serif";

// ── Lucide-style inline SVGs ──────────────────────────────────
function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 1.5 }) {
  const paths = {
    home:      <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    book:      <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    orders:    <><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></>,
    profile:   <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    chevronR:  <polyline points="9 18 15 12 9 6"/>,
    chevronL:  <polyline points="15 18 9 12 15 6"/>,
    check:     <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
    clock:     <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    pkg:       <><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
    truck:     <><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>,
    wa:        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>,
    star:      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    settings:  <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    bell:      <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    help:      <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    logout:    <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

// ── Status Tag ────────────────────────────────────────────────
const STATUS_STYLES = {
  'Received':        { bg: '#F5F7FA', fg: '#5A6A8A' },
  'In Progress':     { bg: '#D6EAF8', fg: '#1A6FD4' },
  'Ready for Pickup':{ bg: '#E8F1FB', fg: '#0A1F44' },
  'Completed':       { bg: '#0A1F44', fg: '#FFFFFF' },
  'Pending Payment': { bg: '#FEF3F0', fg: '#993C1D' },
};

function StatusTag({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES['Received'];
  return (
    <span style={{
      fontSize: 10, fontWeight: 500, fontFamily: font,
      background: s.bg, color: s.fg,
      borderRadius: 4, padding: '3px 8px',
      display: 'inline-block',
    }}>{status}</span>
  );
}

// ── Bottom Nav ────────────────────────────────────────────────
function BottomNav({ active, onChange }) {
  const items = [
    { id: 'home',    label: 'Home',    icon: 'home' },
    { id: 'book',    label: 'Book',    icon: 'book' },
    { id: 'orders',  label: 'Orders',  icon: 'orders' },
    { id: 'notifs',  label: 'Inbox',   icon: 'bell' },
    { id: 'profile', label: 'Profile', icon: 'profile' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: C.white, borderTop: `1px solid ${C.border}`,
      display: 'flex', padding: '8px 0 28px', zIndex: 20,
    }}>
      {items.map(item => {
        const isActive = active === item.id;
        return (
          <button key={item.id} onClick={() => onChange(item.id)} style={{
            flex: 1, background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            color: isActive ? C.blue : C.caption,
            fontFamily: font, padding: 0,
          }}>
            <Icon name={item.icon} size={22} color={isActive ? C.blue : C.caption} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 500 : 400 }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── HOME SCREEN ───────────────────────────────────────────────
function HomeScreen({ onNavigate }) {
  const orders = [
    { id: 'CC-0041', item: 'Nike Air Force 1', service: 'Sneaker Clean', status: 'In Progress', pct: 55, eta: 'May 2' },
    { id: 'CC-0039', item: 'Clarks Originals', service: 'Clarks Clean', status: 'Ready for Pickup', pct: 100, eta: 'Today' },
  ];
  return (
    <div style={{ background: C.offWhite, minHeight: '100%', fontFamily: font, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.white }}>
        <img src={window.__resources && window.__resources.logoImg ? window.__resources.logoImg : "assets/logo.png"} alt="Clean Crep JA" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: C.caption, fontWeight: 400 }}>WELCOME BACK</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: C.navy }}>Hi, Geego 👋</div>
        </div>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Hero Card */}
        <div style={{
          background: C.navy, borderRadius: 16, padding: '24px 20px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(26,111,212,0.15)' }} />
          <div style={{ position: 'absolute', bottom: -30, right: 20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(26,111,212,0.1)' }} />
          <div style={{ fontSize: 10, fontWeight: 500, color: C.softBlue, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>CLEAN CREP JAMAICA</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: C.white, lineHeight: 1.25, marginBottom: 6 }}>Your Creps<br />Deserve Better.</div>
          <div style={{ fontSize: 12, color: C.softBlue, marginBottom: 20, lineHeight: 1.5 }}>Drop in at Half Way Tree or<br />link us to book your clean.</div>
          <button
            onClick={() => onNavigate('book')}
            style={{
              background: C.blue, color: C.white, border: 'none', borderRadius: 8,
              padding: '11px 22px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              fontFamily: font,
            }}>
            Book a Clean
          </button>
        </div>

        {/* Services Row */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 500, color: C.caption, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>SERVICES</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { name: 'Sneaker Clean', price: '$2,000', icon: 'pkg' },
              { name: 'Clarks Clean', price: '$3,500', icon: 'star' },
              { name: 'Sole Refresh', price: 'Quote', icon: 'check' },
            ].map(s => (
              <button key={s.name} onClick={() => onNavigate('book')} style={{
                flex: 1, background: C.white, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: '12px 8px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                fontFamily: font,
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: C.ice, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={s.icon} size={17} color={C.blue} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 500, color: C.navy, textAlign: 'center', lineHeight: 1.3 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: C.blue, fontWeight: 500 }}>{s.price}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Active Orders */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 500, color: C.caption, textTransform: 'uppercase', letterSpacing: 2 }}>ACTIVE ORDERS</div>
            <button onClick={() => onNavigate('orders')} style={{ background: 'none', border: 'none', fontSize: 11, color: C.blue, cursor: 'pointer', fontFamily: font, fontWeight: 500 }}>See All</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orders.map(o => (
              <div key={o.id} onClick={() => onNavigate('orders')} style={{
                background: C.white, borderRadius: 12, padding: '14px 16px',
                border: `1px solid ${C.border}`, cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: C.navy }}>{o.item}</div>
                    <div style={{ fontSize: 11, color: C.caption, marginTop: 2 }}>{o.id} · {o.service}</div>
                  </div>
                  <StatusTag status={o.status} />
                </div>
                <div style={{ height: 4, background: C.ice, borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${o.pct}%`, height: '100%', background: C.blue, borderRadius: 99, transition: 'width 300ms ease-out' }} />
                </div>
                <div style={{ fontSize: 11, color: C.caption, marginTop: 6 }}>Est. ready: <strong style={{ color: C.navy }}>{o.eta}</strong></div>
              </div>
            ))}
          </div>
        </div>

        {/* WhatsApp Banner */}
        <div style={{ background: C.navy, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.white, marginBottom: 2 }}>Questions? Link us.</div>
            <div style={{ fontSize: 11, color: C.softBlue }}>Shop 19, Pristine Plaza, HWT</div>
          </div>
          <a href="https://wa.me/18765072163" target="_blank" rel="noopener noreferrer" style={{
            background: '#25D366', color: C.white, border: 'none', borderRadius: 8,
            padding: '8px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
            fontFamily: font, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Icon name="wa" size={14} color="#fff" />
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

// ── BOOKING SCREEN ────────────────────────────────────────────
function BookingScreen({ onNavigate }) {
  const [step, setStep] = useState(0); // 0=service, 1=details, 2=confirm
  const [selected, setSelected] = useState(null);
  const [dropoff, setDropoff] = useState(true);
  const [selDay, setSelDay] = useState(0);
  const [notes, setNotes] = useState('');
  const [shoeType, setShoeType] = useState('');

  const services = [
    { id: 'sneaker', name: 'Sneaker Clean', price: '$2,000', note: 'JMD', desc: 'Full clean, deodorize, and wipe-down. Looking fresh.', icon: 'pkg' },
    { id: 'clarks',  name: 'Clarks Clean',  price: '$3,500', note: 'JMD', desc: 'Deep clean, conditioning and restoration for your Clarks.', icon: 'star', popular: true },
    { id: 'sole',    name: 'Sole Refresh',  price: 'Quote',  note: 'on inspection', desc: 'Sole yellowing, oxidation removal and sole whitening.', icon: 'check' },
  ];

  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i);
    return { short: d.toLocaleDateString('en-JM', { weekday: 'short' }), num: d.getDate(), month: d.toLocaleDateString('en-JM', { month: 'short' }) };
  });

  if (step === 2) {
    return (
      <div style={{ background: C.offWhite, minHeight: '100%', fontFamily: font, paddingBottom: 80 }}>
        <div style={{ background: C.white, padding: '56px 20px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: C.navy }}>
            <Icon name="chevronL" size={20} color={C.navy} />
          </button>
          <div style={{ fontSize: 15, fontWeight: 500, color: C.navy }}>Confirm Booking</div>
        </div>
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Icon name="check" size={26} color="#16A34A" strokeWidth={2} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 500, color: C.navy, marginBottom: 6 }}>You're booked.</div>
          <div style={{ fontSize: 13, color: C.caption, lineHeight: 1.6, marginBottom: 24 }}>
            Bring in your {selected?.name === 'Clarks Clean' ? 'Clarks' : 'creps'} on <strong style={{ color: C.navy }}>{days[selDay].short} {days[selDay].num}</strong>.<br />
            Shop 19, Pristine Plaza, Half Way Tree.
          </div>
          <div style={{ background: C.ice, borderRadius: 12, padding: 16, width: '100%', marginBottom: 20, textAlign: 'left' }}>
            <div style={{ fontSize: 10, color: C.caption, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, fontWeight: 500 }}>BOOKING SUMMARY</div>
            {[
              ['Service', selected?.name],
              ['Shoe Type', shoeType || '—'],
              ['Drop-off', dropoff ? 'In-store drop-off' : 'Pickup requested'],
              ['Date', `${days[selDay].short} ${days[selDay].num} ${days[selDay].month}`],
              ['Price', `${selected?.price} ${selected?.note}`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: C.caption }}>{k}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: C.navy }}>{v}</span>
              </div>
            ))}
            <div style={{ height: 1, background: C.border, margin: '10px 0' }} />
            <div style={{ fontSize: 11, color: C.caption }}>Payment on drop-off. Cash &amp; transfer accepted.</div>
          </div>
          <button onClick={() => { setStep(0); setSelected(null); onNavigate('home'); }} style={{
            width: '100%', background: C.navy, color: C.white, border: 'none', borderRadius: 8,
            padding: '13px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: font, marginBottom: 10,
          }}>Back to Home</button>
          <a href="https://wa.me/18765072163" target="_blank" rel="noopener noreferrer" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            width: '100%', background: '#25D366', color: C.white, borderRadius: 8,
            padding: '13px', fontSize: 13, fontWeight: 500, textDecoration: 'none', fontFamily: font,
          }}>
            <Icon name="wa" size={16} color="#fff" /> Link Us on WhatsApp
          </a>
        </div>
      </div>
    );
  }

  if (step === 1 && selected) {
    return (
      <div style={{ background: C.offWhite, minHeight: '100%', fontFamily: font, paddingBottom: 80 }}>
        <div style={{ background: C.white, padding: '56px 20px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setStep(0)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Icon name="chevronL" size={20} color={C.navy} />
          </button>
          <div style={{ fontSize: 15, fontWeight: 500, color: C.navy }}>Booking Details</div>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Selected service */}
          <div style={{ background: C.ice, borderRadius: 12, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, color: C.caption, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>SELECTED SERVICE</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: C.navy }}>{selected.name}</div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 500, color: C.blue }}>{selected.price}</div>
          </div>

          {/* Shoe type */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 500, color: C.caption, textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 8 }}>SHOE TYPE / MODEL</label>
            <input
              value={shoeType}
              onChange={e => setShoeType(e.target.value)}
              placeholder="e.g. Nike Air Force 1, Clarks Desert Boot"
              style={{
                width: '100%', background: C.white, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: '11px 14px', fontSize: 13, color: C.charcoal,
                fontFamily: font, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Drop-off / Pickup toggle */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, color: C.caption, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>DROP-OFF METHOD</div>
            <div style={{ display: 'flex', background: C.ice, borderRadius: 8, padding: 3 }}>
              {[{ label: 'Drop Off', val: true }, { label: 'Pickup', val: false }].map(opt => (
                <button key={String(opt.val)} onClick={() => setDropoff(opt.val)} style={{
                  flex: 1, padding: '9px', border: 'none', borderRadius: 6, cursor: 'pointer',
                  background: dropoff === opt.val ? C.white : 'transparent',
                  color: dropoff === opt.val ? C.navy : C.caption,
                  fontSize: 13, fontWeight: dropoff === opt.val ? 500 : 400,
                  fontFamily: font, boxShadow: dropoff === opt.val ? '0 1px 4px rgba(10,31,68,0.1)' : 'none',
                  transition: 'all 150ms',
                }}>{opt.label}</button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, color: C.caption, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>SELECT DATE</div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {days.map((d, i) => (
                <button key={i} onClick={() => setSelDay(i)} style={{
                  flexShrink: 0, width: 50, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: selDay === i ? C.blue : C.white,
                  color: selDay === i ? C.white : C.navy,
                  fontFamily: font, boxSizing: 'border-box',
                  border: selDay === i ? 'none' : `1px solid ${C.border}`,
                }}>
                  <span style={{ fontSize: 9, fontWeight: 500, opacity: 0.8, marginBottom: 2 }}>{d.short}</span>
                  <span style={{ fontSize: 18, fontWeight: 500 }}>{d.num}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 500, color: C.caption, textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 8 }}>NOTES (OPTIONAL)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any special instructions for your pair…"
              rows={3}
              style={{
                width: '100%', background: C.white, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: '11px 14px', fontSize: 13, color: C.charcoal,
                fontFamily: font, outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5,
              }}
            />
          </div>

          <button onClick={() => setStep(2)} style={{
            width: '100%', background: C.blue, color: C.white, border: 'none', borderRadius: 8,
            padding: '14px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: font,
          }}>
            Confirm Booking
          </button>
        </div>
      </div>
    );
  }

  // Step 0: Service picker
  return (
    <div style={{ background: C.offWhite, minHeight: '100%', fontFamily: font, paddingBottom: 80 }}>
      <div style={{ background: C.white, padding: '56px 20px 14px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: C.navy }}>Book a Clean</div>
        <div style={{ fontSize: 13, color: C.caption, marginTop: 4 }}>Choose a service to get started.</div>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: C.caption, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>AVAILABLE SERVICES</div>
        {services.map(svc => (
          <div key={svc.id} onClick={() => { setSelected(svc); setStep(1); }} style={{
            background: C.white, borderRadius: 12,
            border: svc.popular ? `1.5px solid ${C.blue}` : `1px solid ${C.border}`,
            padding: 16, cursor: 'pointer', position: 'relative',
          }}>
            {svc.popular && (
              <span style={{
                position: 'absolute', top: 12, right: 12,
                background: C.ice, color: C.blue,
                fontSize: 9, fontWeight: 500, borderRadius: 20, padding: '2px 8px',
                textTransform: 'uppercase', letterSpacing: 1,
              }}>Most Popular</span>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: C.ice, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={svc.icon} size={18} color={C.blue} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: C.navy, marginBottom: 4 }}>{svc.name}</div>
                <div style={{ fontSize: 11, color: C.caption, lineHeight: 1.5, marginBottom: 10 }}>{svc.desc}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 20, fontWeight: 500, color: C.blue }}>{svc.price}</span>
                  <span style={{ fontSize: 11, color: C.caption }}>{svc.note}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ORDER TRACKER SCREEN ──────────────────────────────────────
function OrdersScreen({ onNavigate }) {
  const [active, setActive] = useState(null);

  const orders = [
    { id: 'CC-0041', item: 'Nike Air Force 1', service: 'Sneaker Clean', status: 'In Progress',      step: 2, eta: 'May 2, 2025',  color: '#1A6FD4' },
    { id: 'CC-0039', item: 'Clarks Originals',  service: 'Clarks Clean',  status: 'Ready for Pickup', step: 3, eta: 'Today',        color: '#0A1F44' },
    { id: 'CC-0035', item: 'Jordan 1 Retro',    service: 'Sneaker Clean', status: 'Completed',        step: 4, eta: 'Apr 24, 2025', color: '#0A1F44' },
  ];

  const STEPS = ['Received', 'In Progress', 'Ready', 'Picked Up'];

  const sel = active !== null ? orders[active] : orders[0];

  return (
    <div style={{ background: C.offWhite, minHeight: '100%', fontFamily: font, paddingBottom: 80 }}>
      <div style={{ background: C.white, padding: '56px 20px 14px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 20, fontWeight: 500, color: C.navy }}>Orders</div>
        <div style={{ fontSize: 13, color: C.caption, marginTop: 4 }}>Track your cleans.</div>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Detail card for selected order */}
        <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ background: C.navy, padding: '16px 16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div>
                <div style={{ fontSize: 10, color: C.softBlue, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 500 }}>ORDER {sel.id}</div>
                <div style={{ fontSize: 17, fontWeight: 500, color: C.white }}>{sel.item}</div>
                <div style={{ fontSize: 11, color: C.softBlue, marginTop: 2 }}>{sel.service}</div>
              </div>
              <StatusTag status={sel.status} />
            </div>
          </div>

          <div style={{ padding: '16px 16px 14px' }}>
            {/* Progress steps */}
            <div style={{ position: 'relative', marginBottom: 6 }}>
              {/* track */}
              <div style={{ position: 'absolute', top: 10, left: '12.5%', right: '12.5%', height: 2, background: C.ice }} />
              <div style={{
                position: 'absolute', top: 10, left: '12.5%',
                width: `${Math.min((sel.step) / (STEPS.length - 1), 1) * 75}%`,
                height: 2, background: C.blue, transition: 'width 300ms ease-out',
              }} />
              <div style={{ display: 'flex', position: 'relative', zIndex: 1 }}>
                {STEPS.map((st, i) => {
                  const done = i < sel.step;
                  const cur  = i === sel.step - 1;
                  return (
                    <div key={st} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: done || cur ? C.blue : C.ice,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: cur ? `2px solid ${C.blue}` : 'none',
                        fontSize: 9, fontWeight: 700, color: done || cur ? C.white : C.caption,
                      }}>{done ? '✓' : i + 1}</div>
                      <div style={{ fontSize: 8, color: cur ? C.navy : C.caption, fontWeight: cur ? 500 : 400, textAlign: 'center', lineHeight: 1.3 }}>{st}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
              <div style={{ fontSize: 11, color: C.caption }}>
                Est. ready: <strong style={{ color: C.navy }}>{sel.eta}</strong>
              </div>
              <a href="https://wa.me/18765072163" target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: '#25D366', color: C.white, borderRadius: 8,
                padding: '7px 12px', fontSize: 11, fontWeight: 500, textDecoration: 'none', fontFamily: font,
              }}>
                <Icon name="wa" size={13} color="#fff" /> WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Orders list */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 500, color: C.caption, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>ALL ORDERS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orders.map((o, idx) => (
              <div key={o.id} onClick={() => setActive(idx)} style={{
                background: C.white, borderRadius: 12, padding: '13px 14px',
                border: (active === idx || (active === null && idx === 0)) ? `1.5px solid ${C.blue}` : `1px solid ${C.border}`,
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.navy }}>{o.item}</div>
                  <div style={{ fontSize: 11, color: C.caption, marginTop: 2 }}>{o.id} · {o.service}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <StatusTag status={o.status} />
                  <div style={{ fontSize: 10, color: C.caption }}>{o.eta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PROFILE SCREEN ────────────────────────────────────────────
function ProfileScreen({ onNavigate }) {
  const pastOrders = [
    { id: 'CC-0035', item: 'Jordan 1 Retro',   service: 'Sneaker Clean', date: 'Apr 24, 2025', price: '$2,000' },
    { id: 'CC-0028', item: 'Clarks Originals',  service: 'Clarks Clean',  date: 'Apr 10, 2025', price: '$3,500' },
    { id: 'CC-0019', item: 'Nike Dunk Low',      service: 'Sneaker Clean', date: 'Mar 28, 2025', price: '$2,000' },
  ];

  return (
    <div style={{ background: C.offWhite, minHeight: '100%', fontFamily: font, paddingBottom: 80 }}>
      {/* Profile header */}
      <div style={{ background: C.navy, padding: '56px 20px 28px', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: C.blue,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px', fontSize: 22, fontWeight: 500, color: C.white,
        }}>GG</div>
        <div style={{ fontSize: 18, fontWeight: 500, color: C.white }}>Geego</div>
        <div style={{ fontSize: 12, color: C.softBlue, marginTop: 3 }}>geego@email.com</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 20 }}>
          {[
            { label: 'CLEANS', val: '7' },
            { label: 'POINTS', val: '350' },
            { label: 'MEMBER', val: '6mo' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 500, color: C.white }}>{stat.val}</div>
              <div style={{ fontSize: 9, color: C.softBlue, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 500, marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Loyalty card */}
        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 500, color: C.caption, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 2 }}>LOYALTY POINTS</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: C.navy }}>350 / 500 pts</div>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.ice, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="star" size={17} color={C.blue} />
            </div>
          </div>
          <div style={{ height: 6, background: C.ice, borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: '70%', height: '100%', background: C.blue, borderRadius: 99 }} />
          </div>
          <div style={{ fontSize: 11, color: C.caption, marginTop: 6 }}>150 points to a <strong style={{ color: C.navy }}>free clean</strong>.</div>
        </div>

        {/* Past orders */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 500, color: C.caption, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>PAST ORDERS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            {pastOrders.map((o, i) => (
              <div key={o.id} style={{
                padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: i < pastOrders.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.navy }}>{o.item}</div>
                  <div style={{ fontSize: 11, color: C.caption, marginTop: 2 }}>{o.service} · {o.date}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.blue }}>{o.price}</div>
                  <StatusTag status="Completed" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 500, color: C.caption, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>SETTINGS</div>
          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            {[
              { icon: 'bell', label: 'Notifications' },
              { icon: 'help', label: 'Help & Support' },
              { icon: 'settings', label: 'Account Settings' },
              { icon: 'logout', label: 'Sign Out', danger: true },
            ].map((item, i, arr) => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
                borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                cursor: 'pointer',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: item.danger ? '#FEF3F0' : C.ice, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={item.icon} size={16} color={item.danger ? '#993C1D' : C.blue} />
                </div>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 400, color: item.danger ? '#993C1D' : C.charcoal }}>{item.label}</span>
                {!item.danger && <Icon name="chevronR" size={16} color={C.caption} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── NOTIFICATIONS SCREEN ─────────────────────────────────────
function NotificationsScreen({ onNavigate }) {
  const [notifications, setNotifications] = React.useState([
    { id: 1, type: 'ready',    read: false, title: 'Ready for Pickup',   body: 'Your Clarks Originals are clean and waiting at Shop 19.',          time: '2 min ago',   order: 'CC-0039' },
    { id: 2, type: 'progress', read: false, title: 'In Progress',        body: 'Your Nike Air Force 1 is being cleaned right now.',                time: '1 hr ago',    order: 'CC-0041' },
    { id: 3, type: 'promo',    read: false, title: 'Bring a Friend',     body: 'Refer a friend and get $500 off your next clean. Link us to claim.', time: '3 hrs ago',   order: null },
    { id: 4, type: 'received', read: true,  title: 'Order Received',     body: 'We got your Jordan 1 Retro. Drop-off confirmed for today.',         time: 'Yesterday',   order: 'CC-0041' },
    { id: 5, type: 'complete', read: true,  title: 'Order Completed',    body: 'Your Jordan 1 Retro has been picked up. Step clean! ✓',             time: 'Apr 24',      order: 'CC-0035' },
    { id: 6, type: 'promo',    read: true,  title: 'Loyalty Milestone',  body: "You're 150 points from a free clean. Keep stepping.",               time: 'Apr 22',      order: null },
    { id: 7, type: 'complete', read: true,  title: 'Order Completed',    body: 'Your Clarks Desert Boot is done. Pickup at Half Way Tree.',         time: 'Apr 10',      order: 'CC-0028' },
  ]);

  const iconMap = {
    ready:    { icon: 'truck',  bg: '#E8F1FB', color: '#0A1F44' },
    progress: { icon: 'clock',  bg: '#D6EAF8', color: '#1A6FD4' },
    promo:    { icon: 'star',   bg: '#FEF9E7', color: '#B45309' },
    received: { icon: 'pkg',    bg: '#F5F7FA', color: '#5A6A8A' },
    complete: { icon: 'check',  bg: '#DCFCE7', color: '#16A34A' },
  };

  const unread = notifications.filter(n => !n.read).length;

  function markAllRead() {
    setNotifications(ns => ns.map(n => ({ ...n, read: true })));
  }

  function markRead(id) {
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  }

  const today  = notifications.filter(n => ['2 min ago','1 hr ago','3 hrs ago'].includes(n.time));
  const earlier = notifications.filter(n => !['2 min ago','1 hr ago','3 hrs ago'].includes(n.time));

  function NSection({ label, items }) {
    return (
      <div>
        <div style={{ fontSize: 10, fontWeight: 500, color: C.caption, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>{label}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          {items.map((n, i) => {
            const ico = iconMap[n.type];
            return (
              <div
                key={n.id}
                onClick={() => { markRead(n.id); if (n.order) onNavigate('orders'); }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 14px',
                  borderBottom: i < items.length - 1 ? `1px solid ${C.border}` : 'none',
                  background: !n.read ? `rgba(26,111,212,0.04)` : C.white,
                  cursor: 'pointer', position: 'relative',
                }}
              >
                {/* unread dot */}
                {!n.read && (
                  <div style={{ position: 'absolute', top: 16, left: 6, width: 5, height: 5, borderRadius: '50%', background: C.blue }} />
                )}
                <div style={{ width: 36, height: 36, borderRadius: 10, background: ico.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={ico.icon} size={16} color={ico.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                    <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 500, color: C.navy, textWrap: 'pretty' }}>{n.title}</div>
                    <div style={{ fontSize: 10, color: C.caption, flexShrink: 0, marginLeft: 8 }}>{n.time}</div>
                  </div>
                  <div style={{ fontSize: 11, color: C.caption, lineHeight: 1.5, textWrap: 'pretty' }}>{n.body}</div>
                  {n.order && (
                    <div style={{ fontSize: 10, color: C.blue, fontWeight: 500, marginTop: 4 }}>Order {n.order}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.offWhite, minHeight: '100%', fontFamily: font, paddingBottom: 80 }}>
      <div style={{ background: C.white, padding: '56px 20px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 500, color: C.navy }}>Inbox</div>
          <div style={{ fontSize: 13, color: C.caption, marginTop: 3 }}>
            {unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'All caught up.'}
          </div>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} style={{ background: 'none', border: 'none', fontSize: 12, color: C.blue, cursor: 'pointer', fontFamily: font, fontWeight: 500, paddingBottom: 2 }}>
            Mark all read
          </button>
        )}
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {today.length > 0 && <NSection label="TODAY" items={today} />}
        {earlier.length > 0 && <NSection label="EARLIER" items={earlier} />}
      </div>
    </div>
  );
}

// ── APP SHELL (single phone) ──────────────────────────────────
function AppShell({ initialScreen = 'home' }) {
  const [screen, setScreen] = useState(initialScreen);

  const screens = {
    home:    <HomeScreen    onNavigate={setScreen} />,
    book:    <BookingScreen onNavigate={setScreen} />,
    orders:  <OrdersScreen  onNavigate={setScreen} />,
    profile: <ProfileScreen onNavigate={setScreen} />,
  };

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        {screens[screen]}
      </div>
      <BottomNav active={screen} onChange={setScreen} />
    </div>
  );
}

Object.assign(window, { AppShell, HomeScreen, BookingScreen, OrdersScreen, NotificationsScreen, ProfileScreen, BottomNav });
