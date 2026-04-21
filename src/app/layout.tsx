import type { Metadata } from 'next'
import { Sora } from 'next/font/google'
import { Toaster } from 'sonner'
import { LocaleProvider } from '@/lib/i18n/LocaleContext'
import { getLocale } from '@/lib/i18n'
import './globals.css'

const sora = Sora({ subsets: ['latin'], variable: '--font-sora', display: 'swap' })

const BASE_URL = 'https://www.ghoandco.com'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    template: '%s — Gho&Co',
    default: 'Gho&Co — Custom Shirts, 3D Prints & More in Canada',
  },
  description:
    'Gho&Co creates custom printed shirts with DTF transfers, 3D printed items, DIY projects, and custom lighting. Order online and get a personalized quote.',
  keywords: [
    'custom shirts Canada', 'custom t-shirts Quebec', 'DTF printing', 'heat press transfers',
    '3D printing service Canada', 'custom merch', 'personalized shirts', 'custom lighting Canada',
    'impression personnalisée', 'chandails personnalisés', 'Gho&Co',
  ],
  authors: [{ name: 'Gho&Co', url: BASE_URL }],
  creator: 'Gho&Co',
  publisher: 'Gho&Co',
  openGraph: {
    type: 'website',
    locale: 'fr_CA',
    alternateLocale: 'en_CA',
    url: BASE_URL,
    siteName: 'Gho&Co',
    title: 'Gho&Co — Custom Shirts, 3D Prints & More',
    description:
      'Custom printed shirts, 3D printed items, DIY projects, and custom lighting. Made exactly the way you want it.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gho&Co — Custom Shirts, 3D Prints & More',
    description:
      'Custom printed shirts, 3D printed items, DIY projects, and custom lighting. Made exactly the way you want it.',
  },
  alternates: { canonical: BASE_URL },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  return (
    <html lang={locale}>
      <body className={`${sora.variable} font-sora`}>
        <LocaleProvider initial={locale}>
          {children}
        </LocaleProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
