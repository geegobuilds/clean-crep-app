'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

// Homepage nav: sticky frosted glass, a little shorter once you scroll, and
// light glass while a white band (or the footer) is underneath it.

const LIGHT = '.band-white, .site-footer';

export function SiteNav({ bookHref }: { bookHref: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [light, setLight] = useState(false);
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      setScrolled(window.scrollY > 24);
      // What sits under the middle of the nav bar, skipping the nav itself.
      const y = (nav.current?.offsetHeight ?? 60) / 2;
      const under = document.elementsFromPoint(window.innerWidth / 2, y).find((el) => !nav.current?.contains(el));
      setLight(!!under?.closest(LIGHT));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // Content above can grow (images, reveals) and move a new band under the nav without a scroll.
    const ro = new ResizeObserver(onScroll);
    ro.observe(document.body);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <nav ref={nav} className={`site-nav${scrolled ? ' is-scrolled' : ''}${light ? ' is-light' : ''}`} aria-label="Main">
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
