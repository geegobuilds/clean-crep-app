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
          <div className="legal-updated">Last updated October 8, 2026</div>
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
            We clean sneakers, Clarks, caps and hats, with add-ons such as Sole Refresh, at the prices shown
            in the app, on the website or by Creppie when you book. You can drop off at the shop, book a
            CrepRun pickup in the areas we serve, or send items by Knutsford Express. Turnaround times are
            estimates, not guarantees.
          </p>

          <h2>Creppie, our AI assistant</h2>
          <p>
            Creppie is an AI assistant. It can answer questions and take bookings, but it can make mistakes.
            The prices and availability confirmed by our team, or shown in the app, are the ones that apply.
            Ask for a person at any time.
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

          <h2>Photos</h2>
          <p>
            We photograph items at drop-off and when they&rsquo;re done, to record their condition and to show
            you the result. We won&rsquo;t post photos of your items publicly without asking you first.
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

          <h2>Clean Crep Club</h2>
          <ul>
            <li>The Club is a monthly plan that gives you care credits to spend on cleans. Each plan&rsquo;s
              price and credits are shown in the app before you join.</li>
            <li>There is no contract and no automatic charge. You pay each month by bank transfer, Lynk or
              cash, and your credits switch on once we confirm your payment.</li>
            <li>To cancel, just don&rsquo;t renew, or tell us on WhatsApp. Your plan stops at the end of the
              month you paid for.</li>
            <li>Unused credits roll over as shown in the app while your membership is active. Credits have no
              cash value, can&rsquo;t be transferred outside your household plan, and aren&rsquo;t refundable
              once you&rsquo;ve used any of that month&rsquo;s credits.</li>
            <li>On a household plan, the plan owner decides who shares the credits, up to the plan&rsquo;s
              limit.</li>
          </ul>

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
