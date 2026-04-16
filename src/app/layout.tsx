import type { Metadata } from 'next'
import { Sora } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const sora = Sora({ subsets: ['latin'], variable: '--font-sora', display: 'swap' })

export const metadata: Metadata = {
  title: 'Gho&Co',
  description: 'Custom shirts, 3D prints, DIY projects, and custom lighting.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${sora.variable} font-sora`}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
