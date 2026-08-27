import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — Clean Crep Jamaica',
};

export default function PrivacyPage() {
  return (
    <>
      <div className="legal-header">
        <div className="legal-header-inner">
          <Link href="/" className="legal-back">
            ← Back to site
          </Link>
          <h1 className="legal-title">Privacy Policy</h1>
          <div className="legal-updated">Last updated August 27, 2026</div>
        </div>
      </div>

      <div className="legal-body">
        <div className="legal-content">
          <p>
            Clean Crep Jamaica (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates a sneaker and Clarks cleaning
            service out of Shop 19, Pristine Plaza, Half Way Tree, Kingston, Jamaica, along with the mobile
            app, website, and staff systems that support it. This page explains what information we collect
            through those systems, why, and what you can do about it.
          </p>

          <h2>What we collect</h2>
          <p>When you create an account or book a clean, we collect:</p>
          <ul>
            <li><strong>Account details</strong> — your name, email address, and phone number.</li>
            <li><strong>Order details</strong> — the service booked, item description, drop-off or pickup
              preference, notes you add, and price.</li>
            <li><strong>Order history</strong> — a record of past orders, used to show your history in the
              app and to calculate loyalty points.</li>
          </ul>
          <p>
            We don&rsquo;t collect payment card details through the app — payment happens in person at the
            shop, by cash or bank transfer.
          </p>

          <h2>How we use it</h2>
          <ul>
            <li>To take and track your bookings, and to notify you when your order status changes.</li>
            <li>To run the loyalty points program.</li>
            <li>To contact you about an order, by app notification or WhatsApp, if you reach out to us
              there.</li>
          </ul>
          <p>We do not sell your information, and we do not use it for advertising.</p>

          <h2>Who can see it</h2>
          <p>
            You can see your own account and order data in the app. Clean Crep Jamaica staff can see all
            customer and order data through our operator dashboard, in order to run the business — take
            bookings, update order status, and provide support.
          </p>

          <h2>Where it&rsquo;s stored</h2>
          <p>
            Your data is stored in a Supabase-hosted database. Supabase acts as our infrastructure
            provider — it stores the data on our behalf and does not use it for its own purposes. Access to
            your data is restricted by database-level security rules: customer accounts can only read and
            write their own records.
          </p>

          <h2>Cookies</h2>
          <p>
            The customer-facing app and landing page don&rsquo;t use tracking or advertising cookies. Our staff
            dashboard uses a session cookie to keep staff signed in — that&rsquo;s the only cookie use on this
            site.
          </p>

          <h2>Your rights</h2>
          <p>
            You can ask us to access, correct, or delete your personal data at any time by contacting us
            below. As a Jamaica-based business, we handle these requests in line with Jamaica&rsquo;s{' '}
            <strong>Data Protection Act, 2020</strong>.
          </p>

          <h2>Changes to this policy</h2>
          <p>
            If we make material changes to how we handle your data, we&rsquo;ll update the date at the top of
            this page.
          </p>

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
