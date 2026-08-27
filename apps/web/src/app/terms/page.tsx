import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — Clean Crep Jamaica',
};

export default function TermsPage() {
  return (
    <>
      <div className="legal-header">
        <div className="legal-header-inner">
          <Link href="/" className="legal-back">
            ← Back to site
          </Link>
          <h1 className="legal-title">Terms of Service</h1>
          <div className="legal-updated">Last updated August 27, 2026</div>
        </div>
      </div>

      <div className="legal-body">
        <div className="legal-content">
          <p>
            These terms cover bookings made through the Clean Crep Jamaica app or website, and visits to
            Shop 19, Pristine Plaza, Half Way Tree, Kingston. By creating an account or booking a clean, you
            agree to them.
          </p>

          <h2>The service</h2>
          <p>
            We offer sneaker and Clarks cleaning services — Sneaker Clean, Clarks Clean, and Sole Refresh —
            at the prices shown in the app at the time of booking. Sole Refresh pricing is a quote given on
            inspection, since it depends on the condition of the pair.
          </p>

          <h2>Booking and payment</h2>
          <ul>
            <li>A booking reserves a service and a date — it doesn&rsquo;t confirm your item has been
              received until you&rsquo;ve dropped it off or we&rsquo;ve picked it up.</li>
            <li>Payment is due on drop-off or pickup, by cash or bank transfer. We don&rsquo;t take payment
              through the app.</li>
            <li>We&rsquo;ll update your order status as we go, and notify you when it&rsquo;s ready.</li>
          </ul>

          <h2>Your items</h2>
          <p>
            We treat every pair with care, but cleaning any well-worn item carries some inherent risk —
            especially for pairs with existing damage, delamination, prior repairs, or non-standard
            materials. Let us know about any of that when you drop off. We&rsquo;re not responsible for
            pre-existing damage or wear, or for damage arising from a material or construction defect in the
            item itself.
          </p>
          <p>
            Items not collected within <strong>30 days</strong> of being marked ready for pickup may be
            treated as abandoned. We&rsquo;ll try to reach you by app notification and WhatsApp first.
          </p>

          <h2>Cancellations</h2>
          <p>
            You can cancel or change a booking any time before drop-off with no charge — just link us on
            WhatsApp. Once an item is in for cleaning, cancellation isn&rsquo;t possible for that order.
          </p>

          <h2>Your account</h2>
          <p>
            Keep your account details accurate and your login credentials to yourself. You&rsquo;re
            responsible for activity under your account. One account per person, please.
          </p>

          <h2>Loyalty points</h2>
          <p>
            Points are earned on completed orders and can be redeemed as described in the app. Points have
            no cash value, aren&rsquo;t transferable, and the program&rsquo;s structure may change — we&rsquo;ll
            reflect any change in the app.
          </p>

          <h2>Changes to these terms</h2>
          <p>
            We may update these terms from time to time. If we make a material change, we&rsquo;ll update the
            date at the top of this page.
          </p>

          <h2>Governing law</h2>
          <p>These terms are governed by the laws of Jamaica.</p>

          <h2>Contact us</h2>
          <p>
            Shop 19, Pristine Plaza, Half Way Tree, Kingston, Jamaica
            <br />
            WhatsApp:{' '}
            <a href="https://wa.me/18765072163" target="_blank" rel="noopener noreferrer">
              876-507-2163
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
