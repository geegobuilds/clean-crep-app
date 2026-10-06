'use client';

import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import Image from 'next/image';
import { afterSrc, beforeSrc, type WorkPair } from '@/lib/work';

// "The Difference": drag the line (or use the arrow keys) to compare a pair
// before and after. Arrows / dots cycle through the pairs in lib/work.ts.
// Plain React + CSS clip-path, no slider library.

const SIZES = '(max-width: 960px) 100vw, 880px';

export function BeforeAfter({ pairs }: { pairs: WorkPair[] }) {
  const [index, setIndex] = useState(0);
  const [pos, setPos] = useState(50);
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const pair = pairs[index];
  if (!pair) return null;

  function moveTo(clientX: number) {
    const r = frame.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    moveTo(e.clientX);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (dragging.current) moveTo(e.clientX);
  }

  function stopDrag() {
    dragging.current = false;
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 20 : 5;
    const next =
      e.key === 'ArrowLeft' || e.key === 'ArrowDown'
        ? pos - step
        : e.key === 'ArrowRight' || e.key === 'ArrowUp'
          ? pos + step
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? 100
              : null;
    if (next === null) return;
    e.preventDefault();
    setPos(Math.min(100, Math.max(0, next)));
  }

  function show(i: number) {
    setIndex((i + pairs.length) % pairs.length);
    setPos(50);
  }

  return (
    <div className="ba">
      <div
        ref={frame}
        className="ba-frame"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
      >
        <Image key={`a${pair.n}`} src={afterSrc(pair.n)} alt={`Pair ${pair.n} after cleaning`} fill sizes={SIZES} className="ba-img" draggable={false} />
        <div className="ba-before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <Image key={`b${pair.n}`} src={beforeSrc(pair.n)} alt={`Pair ${pair.n} before cleaning`} fill sizes={SIZES} className="ba-img" draggable={false} />
        </div>
        <span className="ba-tag ba-tag-before" aria-hidden="true">
          Before
        </span>
        <span className="ba-tag ba-tag-after" aria-hidden="true">
          After
        </span>
        <div
          className="ba-handle"
          style={{ left: `${pos}%` }}
          role="slider"
          tabIndex={0}
          aria-label="Before and after comparison"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          aria-valuetext={`${Math.round(pos)}% before`}
          onKeyDown={onKeyDown}
        >
          <span className="ba-knob" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 6 3 12 9 18" />
              <polyline points="15 6 21 12 15 18" />
            </svg>
          </span>
        </div>
      </div>

      {pairs.length > 1 && (
        <div className="ba-controls">
          <button type="button" className="ba-arrow" onClick={() => show(index - 1)} aria-label="Previous pair">
            ‹
          </button>
          <div className="ba-dots">
            {pairs.map((p, i) => (
              <button
                type="button"
                key={p.n}
                className={`ba-dot${i === index ? ' on' : ''}`}
                aria-label={`Show pair ${i + 1} of ${pairs.length}`}
                aria-current={i === index}
                onClick={() => show(i)}
              />
            ))}
          </div>
          <button type="button" className="ba-arrow" onClick={() => show(index + 1)} aria-label="Next pair">
            ›
          </button>
        </div>
      )}
      {pair.caption && <p className="ba-caption">{pair.caption}</p>}
    </div>
  );
}
