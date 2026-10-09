import type { Metadata } from 'next';
import { Archivo, DM_Sans } from 'next/font/google';
import { RecoveryRedirect } from '@/components/recovery-redirect';
import { AnalyticsProvider } from '@/components/analytics-provider';
import { OG_IMAGE, PHOTOS_READY } from '@/lib/work';
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

const TITLE = 'Clean Crep Jamaica — Sneaker & Clarks Cleaning, Half Way Tree';
const DESCRIPTION =
  'Premium sneaker and Clarks cleaning service in Kingston, Jamaica. Shop 19, Pristine Plaza, Half Way Tree. Book online or link us on WhatsApp.';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.cleancrep.com'),
  title: TITLE,
  // Name under the icon when someone adds the site to their iPhone Home Screen.
  appleWebApp: { title: 'Clean Crep' },
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Clean Crep Jamaica',
    locale: 'en_JM',
    title: TITLE,
    description: DESCRIPTION,
    ...(PHOTOS_READY ? { images: [OG_IMAGE] } : {}),
  },
  twitter: {
    card: PHOTOS_READY ? 'summary_large_image' : 'summary',
    title: TITLE,
    description: DESCRIPTION,
    ...(PHOTOS_READY ? { images: [OG_IMAGE.url] } : {}),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${archivo.variable}`}>
      <body>
        <AnalyticsProvider>
          <RecoveryRedirect />
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  );
}
