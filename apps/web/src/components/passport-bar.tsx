'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// Passport page: once the navy header scrolls away, a compact light-glass bar
// keeps the item's name and "Book a clean" in reach (this is the page people
// land on from WhatsApp and the QR tag).

export function PassportBar({ title, watch }: { title: string; watch: string }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const hero = document.getElementById(watch);
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => setShown(!e.isIntersecting), { threshold: 0 });
    io.observe(hero);
    return () => io.disconnect();
  }, [watch]);

  return (
    <div className={`passport-bar${shown ? ' is-shown' : ''}`} aria-hidden={!shown} data-testid="passport-bar">
      <div className="pb-inner">
        <Image src="/assets/logo-cropped.png" alt="" width={28} height={28} className="pb-logo" />
        <span className="pb-title">{title}</span>
        <Link href="/#book" className="pb-cta" tabIndex={shown ? 0 : -1}>
          Book a clean
        </Link>
      </div>
    </div>
  );
}
