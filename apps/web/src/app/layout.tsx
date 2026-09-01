import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import { RecoveryRedirect } from '@/components/recovery-redirect';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-dm-sans',
});

export const metadata: Metadata = {
  title: 'Clean Crep Jamaica — Sneaker & Clarks Cleaning, Half Way Tree',
  description:
    'Premium sneaker and Clarks cleaning service in Kingston, Jamaica. Shop 19, Pristine Plaza, Half Way Tree. Book online or link us on WhatsApp.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body>
        <RecoveryRedirect />
        {children}
      </body>
    </html>
  );
}
