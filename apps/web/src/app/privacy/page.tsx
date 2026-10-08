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
          <div className="legal-updated">Last updated October 8, 2026</div>
        </div>
      </div>

      <div className="legal-body">
        <div className="legal-content">
          <p>
            Clean Crep Jamaica (&ldquo;we&rdquo;, &ldquo;us&rdquo;) runs a sneaker and Clarks cleaning
            service from Shop 19, Pristine Plaza, Half Way Tree, Kingston, Jamaica. We also run the Clean
            Crep app, this website, our Instagram account and the staff systems behind them. This page
            explains what information we collect, why, who helps us handle it, and what you can do about it.
          </p>

          <h2>What we collect</h2>
          <ul>
            <li><strong>Account details</strong>: your name, email address and phone number.</li>
            <li><strong>Bookings</strong>: the service, pairs and add-ons you book, your drop-off day or
              CrepRun pickup area, notes you add, the price, and your order history. We also collect these
              when you book without an account (on the website or through Creppie).</li>
            <li><strong>Chats with Creppie</strong>: the messages you send our AI assistant on Instagram,
              on this website or in the app, and its replies.</li>
            <li><strong>Photos of your items</strong>: our staff photograph pairs at drop-off and when
              they&rsquo;re done, so you can see the before and after and we have a record of their condition.</li>
            <li><strong>Your pairs and Crep Passport</strong>: the pairs you save in the app and their
              cleaning history. A pair&rsquo;s Passport page is only public if you or we turn it on. It shows
              that pair&rsquo;s cleaning history, never your name or contact details.</li>
            <li><strong>Club membership</strong>: your plan, care credits, the payment reference you send
              us, and the account emails of anyone you add to a household plan.</li>
            <li><strong>Loyalty points</strong> earned on completed orders.</li>
            <li><strong>Device and usage data</strong>: a push notification token if you allow
              notifications, and app/website usage events (see &ldquo;Analytics and cookies&rdquo;).</li>
          </ul>
          <p>
            We don&rsquo;t collect card details. You pay at the shop, by cash, bank transfer or Lynk.
          </p>

          <h2>How we use it</h2>
          <ul>
            <li>To take, clean, track and return your bookings, and to tell you when your order changes.</li>
            <li>To answer your questions and take bookings through Creppie.</li>
            <li>To run loyalty points and Club memberships.</li>
            <li>To send reminders, for example when a pair is ready for pickup, when your Club credits are
              about to expire, or when a pair is due for another clean. You can switch push notifications
              off at any time in your phone&rsquo;s settings (Profile &rsaquo; Notifications in the app).</li>
            <li>To understand which parts of the app and website work, so we can improve them.</li>
          </ul>
          <p>We do not sell your information, and we do not use it for third-party advertising.</p>

          <h2>Creppie is an AI assistant</h2>
          <p>
            Creppie, our chat assistant, is powered by AI (Anthropic&rsquo;s Claude). What you type to Creppie
            is sent to Anthropic to write a reply, and saved with your chat history so Creppie can follow
            the conversation and our team can help you. We also use Claude to suggest a condition grade from
            the photos our staff take. AI can make mistakes, so ask for a person on our team at any time.
          </p>

          <h2>Who helps us handle your data</h2>
          <p>We use these services to run Clean Crep. They handle data on our behalf:</p>
          <ul>
            <li><strong>Supabase</strong>: our database, sign-in and photo storage.</li>
            <li><strong>Vercel</strong>: hosts this website.</li>
            <li><strong>Anthropic</strong>: the AI behind Creppie and photo condition grades.</li>
            <li><strong>n8n</strong> and <strong>ManyChat</strong>: carry Instagram and website chats to
              Creppie and back. Instagram messages are also subject to Meta&rsquo;s own privacy policy.</li>
            <li><strong>PostHog</strong>: app and website analytics.</li>
            <li><strong>Google (Gmail)</strong>: sends sign-in and account emails.</li>
            <li><strong>Expo</strong>, <strong>Apple</strong> and <strong>Google</strong>: deliver push
              notifications.</li>
          </ul>
          <p>
            Some of these services store or process data outside Jamaica, mainly in the United States.
            Our staff can see customer and order data in our dashboard so they can run the business.
            Customer accounts can only see their own records.
          </p>

          <h2>Analytics and cookies</h2>
          <p>
            We use PostHog to count things like &ldquo;a booking was started&rdquo; or &ldquo;Creppie was
            opened&rdquo;. We send only those named events, linked to your account id if you&rsquo;re signed
            in. We don&rsquo;t send your name, email, phone or what you type, we don&rsquo;t record your
            screen, and we strip sign-in links from page addresses. PostHog stores an identifier in your
            browser or app (a cookie or local storage) to tell visits apart. We use no advertising cookies or
            tracking pixels. Signing in also uses a session cookie.
          </p>

          <h2>How long we keep it</h2>
          <p>
            We keep your account, order history, chats and photos while your account is open or while we
            need them to finish an order or settle a question about one. Ask us to delete your data and we
            will, except for records we must keep by law, such as for tax or accounting.
          </p>

          <h2>Children</h2>
          <p>
            Our app and website are meant for adults and older teens. They aren&rsquo;t directed at children
            under 13, and we don&rsquo;t knowingly collect their information. If you think a child has given us
            their details, contact us and we&rsquo;ll delete them.
          </p>

          <h2>Your rights</h2>
          <p>
            You can ask us to access, correct or delete your personal data, or to stop using it for
            reminders, by contacting us below. As a Jamaica-based business, we handle these requests, and any
            data breach, in line with Jamaica&rsquo;s <strong>Data Protection Act, 2020</strong>.
          </p>

          <h2>Changes to this policy</h2>
          <p>
            If we change how we handle your data, we&rsquo;ll update this page and the date at the top. For a
            significant change, we&rsquo;ll also tell you in the app.
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
