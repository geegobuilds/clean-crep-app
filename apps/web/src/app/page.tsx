import type { ReactElement } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { AddOn, Service, Zone } from '@clean-crep/shared';
import { formatPrice } from '@clean-crep/shared';
import { createClient } from '@/lib/supabase/server';
import { CreppieChat } from '@/components/creppie-chat';
import { QuickBook } from '@/components/quick-book';
import { ServiceTiles } from '@/components/service-tiles';

const WHATSAPP_URL = 'https://wa.me/18765072163';
// Every "Book" button goes to the Quick Book card in the hero.
const BOOK_NOW_URL = '#book';

const SERVICE_ICONS: Record<string, ReactElement> = {
  pkg: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A6FD4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  ),
  star: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A6FD4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  check: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A6FD4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
    <>
      <nav>
        <div className="nav-inner">
          <a href="#" className="nav-logo">
            <Image src="/assets/logo-cropped.png" alt="Clean Crep JA" width={34} height={34} />
            <span>Clean Crep Jamaica</span>
          </a>
          <div className="nav-links">
            <a href="#services">Services</a>
            <a href="#how">How It Works</a>
            <a href="#location">Location</a>
            <a href="#faq">FAQ</a>
            <a href={BOOK_NOW_URL} className="btn-primary nav-cta" style={{ padding: '8px 18px', fontSize: 13 }}>
              Book Now
            </a>
          </div>
        </div>
      </nav>

      <section className="hero" id="home">
        <div className="hero-inner">
          <div className="hero-content">
            <div className="hero-overline">Kingston, Jamaica · Half Way Tree</div>
            <h1 className="hero-title">
              Clean Crep,<br />
              <span>Clean Step.</span>
            </h1>
            <p className="hero-body">
              Premium sneaker and Clarks cleaning in Half Way Tree. Book in under a minute: drop off at Shop 19, Pristine Plaza, or let CrepRun
              collect from your door.
            </p>
            <ul className="hero-points">
              <li>Open today · 9:00 AM – 6:00 PM</li>
              <li>CrepRun pickup across Kingston, Portmore &amp; Spanish Town</li>
              <li>Not happy? We re-clean free</li>
            </ul>
            <div className="hero-actions">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                Rather talk? Link us on WhatsApp
              </a>
            </div>
          </div>

          <QuickBook services={services} addOns={addOns} zones={zones} />
        </div>
      </section>

      <section id="services">
        <div className="section-inner">
          <div className="section-label">What We Do</div>
          <h2 className="section-title">Services &amp; Pricing</h2>
          <p className="section-body">Every pair gets the same attention. Tap a card to see what&apos;s included and how long it takes.</p>

          <ServiceTiles services={services} icons={SERVICE_ICONS} categories={SERVICE_CATEGORY} />
        </div>
      </section>

      <section id="how">
        <div className="section-inner">
          <div className="section-label">The Process</div>
          <h2 className="section-title">How It Works</h2>
          <p className="section-body">Simple, fast, and transparent — from drop-off to pickup.</p>

          <div className="steps-grid">
            {[
              ['Book or Drop In', 'Book here in under a minute, have CrepRun collect from your door, or just walk into Shop 19 at Pristine Plaza.'],
              ['We Assess', 'We check your pair, confirm the service and price, and give you an estimated ready time.'],
              ['We Clean', 'Your shoes get the full treatment. We update your order status as we go — track it in the app.'],
              ['Pickup & Pay', "Collect your clean pair at the shop. We'll WhatsApp you when they're ready. Cash & bank transfer accepted."],
            ].map(([title, body], i) => (
              <div className="step-card" key={title}>
                <div className="step-num">{i + 1}</div>
                <div className="step-title">{title}</div>
                <p className="step-body">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about">
        <div className="about-inner">
          <div>
            <div className="about-label">About Us</div>
            <h2 className="about-title">Premium Service. Kingston Roots.</h2>
            <p className="about-body">
              Clean Crep Jamaica is a specialist sneaker and Clarks cleaning service based at Pristine Plaza, Half Way Tree. We treat every pair
              like it matters — because to you, it does.
            </p>
            <div className="about-stats" style={{ marginTop: 36 }}>
              {[
                ['500+', 'Pairs Cleaned'],
                ['4.2h', 'Avg Turnaround'],
                ['HWT', 'Kingston'],
              ].map(([val, label]) => (
                <div key={label}>
                  <div className="stat-val">{val}</div>
                  <div className="stat-label">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="about-cards">
            {[
              ['Specialist Clarks knowledge', 'Leather conditioning, midsole cleaning, suede care'],
              ['Real-time order tracking', 'Know exactly where your pair is via the app'],
              ['WhatsApp updates', 'We notify you when your creps are ready for pickup'],
              ['Loyalty program', '500 points earns a free clean — ask us at the shop'],
            ].map(([text, sub]) => (
              <div className="about-card" key={text}>
                <div className="about-card-dot" />
                <div>
                  <div className="about-card-text">{text}</div>
                  <div className="about-card-sub">{sub}</div>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href={BOOK_NOW_URL} className="btn-primary">
                Book a Clean
              </a>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn-primary btn-wa">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                Link Us on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="location">
        <div className="section-inner">
          <div className="section-label">Find Us</div>
          <h2 className="section-title">Shop 19, Pristine Plaza</h2>
          <p className="section-body">Right in the heart of Half Way Tree. Walk in any time during opening hours.</p>

          <div className="location-grid">
            <div className="location-map">
              <svg width="48" height="56" viewBox="0 0 24 28" fill="none">
                <path d="M12 1C7.03 1 3 5.03 3 10c0 7 9 17 9 17s9-10 9-17c0-4.97-4.03-9-9-9z" fill="#1A6FD4" />
                <circle cx="12" cy="10" r="3.5" fill="#fff" />
              </svg>
              <div className="location-map-label">Shop 19, Pristine Plaza</div>
              <div className="location-map-sub">Half Way Tree, Kingston</div>
              <a
                href="https://maps.google.com/?q=Pristine+Plaza+Half+Way+Tree+Kingston+Jamaica"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: '#1A6FD4', fontWeight: 500, textDecoration: 'none', marginTop: 4 }}
              >
                Get Directions →
              </a>
            </div>

            <div className="location-detail">
              <div className="location-address">
                <div className="line1">Shop 19, Pristine Plaza</div>
                <div className="line2">Half Way Tree, Kingston, Jamaica</div>
              </div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--caption)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>
                  Opening Hours
                </div>
                <div className="hours-list">
                  <div className="hours-row">
                    <span className="day">Monday – Friday</span>
                    <span className="time">9:00 AM – 6:00 PM</span>
                  </div>
                  <div className="hours-row">
                    <span className="day">Saturday</span>
                    <span className="time">9:00 AM – 5:00 PM</span>
                  </div>
                  <div className="hours-row">
                    <span className="day">Sunday</span>
                    <span className="time closed">Closed</span>
                  </div>
                </div>
              </div>

              <div className="location-actions">
                <a href={BOOK_NOW_URL} className="btn-primary">
                  Book Online
                </a>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn-primary btn-wa">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq">
        <div className="section-inner">
          <div className="section-label">Questions</div>
          <h2 className="section-title">FAQ</h2>
          <p className="section-body">Everything we get asked most on WhatsApp, answered up front.</p>

          <div className="faq-list">
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
                  <span className="faq-caret">+</span>
                </summary>
                <p className="faq-answer">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-inner">
          <div className="footer-left">
            <Image src="/assets/logo-cropped.png" alt="Clean Crep JA" width={32} height={32} />
            <div>
              <div className="footer-brand">Clean Crep Jamaica</div>
              <div className="footer-tag">Clean Crep, for a Clean Step.</div>
            </div>
          </div>
          <div className="footer-nav-links" style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <a href="#services">Services</a>
            <a href="#how">How It Works</a>
            <a href="#location">Location</a>
            <Link href="/staff/login">Staff Login</Link>
          </div>
          <div className="footer-right" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>
              Privacy
            </Link>
            <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>
              Terms
            </Link>
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
    </>
  );
}
