'use client';

import { useState, type ReactElement } from 'react';
import type { Service } from '@clean-crep/shared';
import { formatPrice } from '@clean-crep/shared';
import { PICK_SERVICE_EVENT } from '@/components/quick-book';

// Services as flip cards: the front sells (price + what it's best for), the
// back answers the questions people DM about (what's done, how long, what to
// add) and books it in the hero card.

function splitDescription(description: string): { what: string; bestFor: string } {
  const [what, bestFor] = description.split(/Best for:\s*/i);
  return { what: what.trim(), bestFor: (bestFor ?? '').trim().replace(/\.$/, '') };
}

function turnaround(days: number | null): string {
  if (days === null) return 'Depends on the pair, we confirm at drop-off';
  if (days <= 0) return 'Same day';
  if (days === 1) return 'Next day';
  return `About ${days} days`;
}

export function ServiceTiles({ services, icons, categories }: { services: Service[]; icons: Record<string, ReactElement>; categories: Record<string, string> }) {
  const [flipped, setFlipped] = useState<string | null>(null);

  return (
    <div className="services-grid">
      {services.map((s) => {
        const { what, bestFor } = splitDescription(s.description);
        const isFlipped = flipped === s.id;
        return (
          <div className={`flip${isFlipped ? ' flipped' : ''}`} key={s.id}>
            <div className="flip-inner">
              <button
                type="button"
                className={`service-card flip-front${s.popular ? ' featured' : ''}`}
                onClick={() => setFlipped(s.id)}
                aria-label={`${s.name}: see what's included`}
                aria-hidden={isFlipped}
                tabIndex={isFlipped ? -1 : 0}
              >
                {s.popular && <div className="service-badge">Most Popular</div>}
                <div className="service-icon">{icons[s.icon]}</div>
                <div className="service-cat">{categories[s.name] ?? ''}</div>
                <div className="service-name">{s.name}</div>
                <p className="service-desc">{bestFor ? `Best for ${bestFor}.` : what}</p>
                <div className="flip-front-foot">
                  <span>
                    <span className="service-price">{formatPrice(s.price_cents)}</span>
                    <span className="service-note">{s.note}</span>
                  </span>
                  <span className="flip-hint">What&apos;s included ↻</span>
                </div>
              </button>

              <div className="service-card flip-back" aria-hidden={!isFlipped}>
                <div className="service-name" style={{ fontSize: 17 }}>
                  {s.name}
                </div>
                <dl className="flip-facts">
                  <dt>What we do</dt>
                  <dd>{what}</dd>
                  <dt>Ready</dt>
                  <dd>{turnaround(s.turnaround_days)}</dd>
                  {s.upsell && (
                    <>
                      <dt>Pairs well with</dt>
                      <dd>{s.upsell}</dd>
                    </>
                  )}
                </dl>
                <div className="flip-back-foot">
                  <button
                    type="button"
                    className="btn-primary"
                    tabIndex={isFlipped ? 0 : -1}
                    onClick={() => window.dispatchEvent(new CustomEvent(PICK_SERVICE_EVENT, { detail: s.id }))}
                  >
                    Book this · {formatPrice(s.price_cents)}
                  </button>
                  <button type="button" className="flip-back-x" tabIndex={isFlipped ? 0 : -1} onClick={() => setFlipped(null)}>
                    ↺ Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
