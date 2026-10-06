'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

// Homepage nav: sticky, frosted glass, and a little shorter once you scroll.

export function SiteNav({ bookHref }: { bookHref: string }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`site-nav${scrolled ? ' is-scrolled' : ''}`} aria-label="Main">
      <div className="sn-inner">
        <a href="#" className="sn-logo">
          <Image src="/assets/logo-cropped.png" alt="" width={34} height={34} priority />
          <span>Clean Crep Jamaica</span>
        </a>
        <div className="sn-links">
          <a href="#services">Services</a>
          <a href="#how">How It Works</a>
          <a href="#location">Location</a>
          <a href="#faq">FAQ</a>
        </div>
        <a href={bookHref} className="sn-cta">
          Book Now
        </a>
      </div>
    </nav>
  );
}
