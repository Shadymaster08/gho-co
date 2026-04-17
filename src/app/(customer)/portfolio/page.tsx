import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getLocale, t } from '@/lib/i18n'
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher'
import PortfolioGallery from './PortfolioGallery'

const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`

export const metadata = {
  title: 'Portfolio — Gho&Co',
  description: 'Our work — custom shirts, 3D prints, DIY objects, and lighting.',
}

export default async function PortfolioPage() {
  const supabase = createClient()
  const locale = getLocale()
  const T = t(locale)
  const p = T.portfolio
  const nav = T.nav

  const { data: images } = await supabase
    .from('portfolio_images')
    .select('id, title, product_type, generated_public_url, created_at')
    .eq('published', true)
    .not('generated_public_url', 'is', null)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{ backgroundImage: GRAIN_SVG, backgroundRepeat: 'repeat' }}
      />

      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-base font-semibold tracking-tight text-white">Gho&amp;Co</Link>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            <Link href="/login" className="text-sm text-white/50 transition-colors hover:text-white">{nav.login}</Link>
            <Link href="/register" className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black transition-colors hover:bg-white/90">
              {nav.startOrder}
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-28">
        <div className="mb-12">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-white/30">{p.ourWork}</p>
          <h1 className="text-4xl font-bold tracking-tighter text-white sm:text-5xl">{p.title}</h1>
          <p className="mt-3 max-w-md text-base text-white/40">{p.subtitle}</p>
        </div>

        <PortfolioGallery
          images={(images ?? []) as { id: string; title: string | null; product_type: string | null; generated_public_url: string }[]}
          noItems={p.noItems}
          cta={p.cta}
          ctaButton={p.ctaButton}
        />
      </main>
    </div>
  )
}
