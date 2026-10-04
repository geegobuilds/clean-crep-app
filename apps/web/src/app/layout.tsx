import type { Metadata } from 'next';
import { Archivo, DM_Sans } from 'next/font/google';
import { RecoveryRedirect } from '@/components/recovery-redirect';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-dm-sans',
});

// Display face for headlines and prices (DESIGN.md §2).
const archivo = Archivo({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-archivo',
});

export const metadata: Metadata = {
  title: 'Clean Crep Jamaica — Sneaker & Clarks Cleaning, Half Way Tree',
  description:
    'Premium sneaker and Clarks cleaning service in Kingston, Jamaica. Shop 19, Pristine Plaza, Half Way Tree. Book online or link us on WhatsApp.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${archivo.variable}`}>
      <body>
        <RecoveryRedirect />
        {children}
      </body>
    </html>
  );
}
