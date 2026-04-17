import type { Metadata } from 'next'
import { Sora } from 'next/font/google'
import { Toaster } from 'sonner'
import { LocaleProvider } from '@/lib/i18n/LocaleContext'
import { getLocale } from '@/lib/i18n'
import './globals.css'

const sora = Sora({ subsets: ['latin'], variable: '--font-sora', display: 'swap' })

export const metadata: Metadata = {
  title: 'Gho&Co',
  description: 'Custom shirts, 3D prints, DIY projects, and custom lighting.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale()
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
