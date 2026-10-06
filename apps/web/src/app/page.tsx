import type { ReactElement } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { AddOn, Service, Zone } from '@clean-crep/shared';
import { formatPrice } from '@clean-crep/shared';
import { createClient } from '@/lib/supabase/server';
import { CreppieChat } from '@/components/creppie-chat';
import { QuickBook } from '@/components/quick-book';
import { ServiceTiles } from '@/components/service-tiles';
import { SiteNav } from '@/components/site-nav';
import { RevealOnScroll } from '@/components/reveal-on-scroll';
import { BeforeAfter } from '@/components/before-after';
import { WORK_PAIRS, afterSrc, beforeSrc } from '@/lib/work';

const WHATSAPP_URL = 'https://wa.me/18765072163';
// Every "Book" button goes to the Quick Book card in the hero.
const BOOK_NOW_URL = '#book';

const SERVICE_ICONS: Record<string, ReactElement> = {
  pkg: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A6FD4" strokeWidth="1.5" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  ),
  star: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A6FD4" strokeWidth="1.5" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  check: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A6FD4" strokeWidth="1.5" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
};

const SERVICE_CATEGORY: Record<string, string> = {
  'Sneaker Clean': 'Sneakers',
  'Clarks Clean': 'Clarks',
  'Sole Refresh': 'Restoration',
};

export default async function LandingPage() {
  const supabase = await createClient();
  const [{ data }, { data: addOnRows }, { data: zoneRows }] = await Promise.all([
    supabase.from('services').select('*').eq('active', true).order('sort_order'),
    supabase.from('add_ons').select('*').eq('active', true).order('sort_order'),
    supabase.from('zones').select('*').eq('active', true).order('sort_order'),
  ]);
  const services = (data ?? []) as Service[];
  const addOns = (addOnRows ?? []) as AddOn[];
  const zones = (zoneRows ?? []) as Zone[];

  return (
    <div className="landing">
      <SiteNav bookHref={BOOK_NOW_URL} />
      <RevealOnScroll />

      <main>
        <section className="hero" id="home">
          <div className="hero-inner">
            <div className="hero-content">
              <p className="eyebrow">Half Way Tree · Kingston</p>
              <h1 className="hero-title">
                Clean Crep,
                <br />
                <span>Clean Step.</span>
              </h1>
              <p className="hero-line">Premium sneaker and Clarks cleaning. Book in under a minute: drop off at Shop 19 or let CrepRun collect.</p>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-link">
                Rather talk? Link us on WhatsApp <span aria-hidden="true">→</span>
              </a>
              <div className="hero-shot" aria-hidden="true">
                <Image src={afterSrc(1)} alt="" fill sizes="(max-width: 899px) 100vw, 560px" className="hero-shot-img" />
                <div className="hero-shot-before">
                  <Image src={beforeSrc(1)} alt="" fill sizes="(max-width: 899px) 100vw, 560px" className="hero-shot-img" />
                </div>
                <span className="ba-tag ba-tag-before">Before</span>
                <span className="ba-tag ba-tag-after">After</span>
              </div>
            </div>

            <div className="hero-book">
              <QuickBook services={services} addOns={addOns} zones={zones} />
            </div>
          </div>
        </section>

        <section className="band band-white" id="difference">
          <div className="band-inner">
            <header className="band-head center" data-reveal>
              <p className="eyebrow">The Difference</p>
              <h2 className="band-title">Same pair. Second life.</h2>
              <p className="band-body">Drag the line to see what one clean does.</p>
            </header>
            <div data-reveal>
              <BeforeAfter pairs={WORK_PAIRS} />
            </div>
          </div>
        </section>

        <section className="band band-navy" id="services">
          <div className="band-inner">
            <header className="band-head" data-reveal>
              <p className="eyebrow">Services &amp; Pricing</p>
              <h2 className="band-title">Every pair gets the same attention.</h2>
              <p className="band-body">Tap a card to see what&apos;s included and how long it takes.</p>
            </header>
            <div data-reveal>
              <ServiceTiles services={services} icons={SERVICE_ICONS} categories={SERVICE_CATEGORY} />
            </div>
          </div>
        </section>

        <section className="band band-white" id="how">
          <div className="band-inner">
            <header className="band-head" data-reveal>
              <p className="eyebrow">How It Works</p>
              <h2 className="band-title">Simple, fast, and transparent.</h2>
              <p className="band-body">From drop-off to pickup, you always know where your pair is.</p>
            </header>
            <ol className="steps">
              {[
                ['Book or drop in', 'Book here in under a minute, have CrepRun collect from your door, or just walk into Shop 19 at Pristine Plaza.'],
                ['We assess', 'We check your pair, confirm the service and price, and give you an estimated ready time.'],
                ['We clean', 'Your shoes get the full treatment. We update your order status as we go. Track it in the app.'],
                ['Pickup & pay', "Collect your clean pair at the shop. We'll WhatsApp you when they're ready. Cash & bank transfer accepted."],
              ].map(([title, body], i) => (
                <li className="step" key={title} data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
                  <span className="step-num">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="step-title">{title}</h3>
                  <p className="step-body">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="band band-navy" id="about">
          <div className="band-inner about-grid">
            <div data-reveal>
              <p className="eyebrow">About Us</p>
              <h2 className="band-title">Premium service. Kingston roots.</h2>
              <p className="band-body">
                Clean Crep Jamaica is a specialist sneaker and Clarks cleaning service based at Pristine Plaza, Half Way Tree. We treat every pair like it
                matters, because to you, it does.
              </p>
              <dl className="stats">
                {[
                  ['500+', 'Pairs cleaned'],
                  ['4.2h', 'Avg turnaround'],
                  ['HWT', 'Kingston'],
                ].map(([val, label]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{val}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div data-reveal>
              <ul className="perks">
                {[
                  ['Specialist Clarks knowledge', 'Leather conditioning, midsole cleaning, suede care.'],
                  ['Real-time order tracking', 'Know exactly where your pair is, right in the app.'],
                  ['WhatsApp updates', 'We let you know the moment your creps are ready.'],
                  ['Loyalty program', '500 points earns a free clean. Ask us at the shop.'],
                ].map(([text, sub]) => (
                  <li key={text}>
                    <strong>{text}</strong>
                    <span>{sub}</span>
                  </li>
                ))}
              </ul>
              <div className="actions">
                <a href={BOOK_NOW_URL} className="btn-primary">
                  Book a Clean
                </a>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                  <WhatsAppGlyph />
                  Link Us on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="band band-white" id="location">
          <div className="band-inner">
            <header className="band-head" data-reveal>
              <p className="eyebrow">Find Us</p>
              <h2 className="band-title">Shop 19, Pristine Plaza.</h2>
              <p className="band-body">Right in the heart of Half Way Tree. Walk in any time during opening hours.</p>
            </header>

            <div className="location-grid" data-reveal>
              <div>
                <h3 className="mini-label">Opening hours</h3>
                <dl className="hours">
                  <div>
                    <dt>Monday – Friday</dt>
                    <dd>10:00 AM – 6:00 PM</dd>
                  </div>
                  <div>
                    <dt>Saturday</dt>
                    <dd>10:00 AM – 3:00 PM</dd>
                  </div>
                  <div>
                    <dt>Sunday</dt>
                    <dd className="closed">Closed</dd>
                  </div>
                  <div>
                    <dt>Public holidays</dt>
                    <dd className="closed">Closed</dd>
                  </div>
                </dl>
              </div>

              <div className="location-side">
                <h3 className="mini-label">Address</h3>
                <address className="address">
                  Shop 19, Pristine Plaza
                  <br />
                  Half Way Tree, Kingston, Jamaica
                </address>
                <a
                  href="https://maps.google.com/?q=Pristine+Plaza+Half+Way+Tree+Kingston+Jamaica"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link"
                >
                  Get directions <span aria-hidden="true">→</span>
                </a>
                <div className="actions">
                  <a href={BOOK_NOW_URL} className="btn-primary">
                    Book Online
                  </a>
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                    <WhatsAppGlyph />
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="band band-navy" id="faq">
          <div className="band-inner">
            <header className="band-head" data-reveal>
              <p className="eyebrow">FAQ</p>
              <h2 className="band-title">Everything we get asked on WhatsApp.</h2>
              <p className="band-body">Answered up front.</p>
            </header>

            <div className="faq-list" data-reveal>
              {[
                [
                  'Do you guarantee your cleaning?',
                  "Yes. If you're not happy with how a pair came back, bring it in and we'll re-clean it free of charge.",
                ],
                [
                  'How long does a clean take?',
                  'Most Sneaker and Clarks cleans are ready the same day, usually within a few hours. Sole Refresh depends on what we find on inspection.',
                ],
                [
                  'How do I pay?',
                  "Cash or bank transfer, due at drop-off or pickup — we don't take payment through the app yet.",
                ],
                [
                  'Do you offer pickup and delivery?',
                  `Yes: CrepRun collects and returns your pairs on a set day for each area. ${zones
                    .map((z) => `${z.areas.split(',')[0].trim()} and nearby: ${z.pickup_day}s, ${formatPrice(z.rate_cents)} round trip`)
                    .join('. ')}. Pick CrepRun pickup when you book.`,
                ],
                [
                  'What if my shoes already have damage?',
                  'Let us know when you drop off — we’ll flag it before we start. See our Terms for how we handle pre-existing damage.',
                ],
                [
                  'How do loyalty points work?',
                  'You earn points on every completed order. 500 points earns a free clean — ask us at the shop.',
                ],
              ].map(([q, a]) => (
                <details className="faq-item" key={q}>
                  <summary className="faq-question">
                    {q}
                    <span className="faq-caret" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="faq-answer">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-left">
            <Image src="/assets/logo-cropped.png" alt="" width={32} height={32} />
            <div>
              <div className="footer-brand">Clean Crep Jamaica</div>
              <div className="footer-tag">Clean Crep, for a Clean Step.</div>
            </div>
          </div>
          <div className="footer-links">
            <a href="#services">Services</a>
            <a href="#how">How It Works</a>
            <a href="#location">Location</a>
            <Link href="/staff/login">Staff Login</Link>
          </div>
          <div className="footer-links footer-legal">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <span>© {new Date().getFullYear()} Clean Crep Jamaica</span>
          </div>
        </div>
      </footer>

      {/* Creppie chat replaces the WhatsApp bubble once its n8n webhook is
          configured (CREPPIE_WEBHOOK_URL on Vercel); WhatsApp stays one tap
          away in the chat header. */}
      {process.env.CREPPIE_WEBHOOK_URL ? (
        <CreppieChat />
      ) : (
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="wa-float" aria-label="Chat on WhatsApp">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </a>
      )}
    </div>
  );
}

function WhatsAppGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
