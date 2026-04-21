'use client'

import { motion } from 'motion/react'
import Link from 'next/link'
import { Shirt, Box, Wrench, Lightbulb, ArrowRight } from 'lucide-react'
import ParticleBackground from './ParticleBackground'
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher'
import { useLocale } from '@/lib/i18n/LocaleContext'

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`

const PRODUCT_HREFS = ['/order/shirts', '/order/3d-prints', '/order/diy', '/order/lighting']
const PRODUCT_ICONS = [Shirt, Box, Wrench, Lightbulb]

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number]

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
}

const stagger = (delay = 0.08) => ({
  hidden: {},
  show: { transition: { staggerChildren: delay, delayChildren: 0.1 } },
})

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}

interface PortfolioImage {
  id: string
  generated_public_url: string | null
  product_type: string | null
}

export default function AnimatedLanding({ portfolioImages = [] }: { portfolioImages?: PortfolioImage[] }) {
  const { t } = useLocale()
  const l = t.landing
  const nav = t.nav

  const products = [
    { icon: Shirt, title: l.products.shirts.title, description: l.products.shirts.description, href: '/order/shirts', tag: l.products.shirts.tag },
    { icon: Box, title: l.products.prints.title, description: l.products.prints.description, href: '/order/3d-prints', tag: null },
    { icon: Wrench, title: l.products.diy.title, description: l.products.diy.description, href: '/order/diy', tag: null },
    { icon: Lightbulb, title: l.products.lighting.title, description: l.products.lighting.description, href: '/order/lighting', tag: null },
  ]

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white">

      <ParticleBackground />

      {/* Nav */}
      <motion.nav
        className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-black/70 backdrop-blur-xl"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <span className="text-base font-semibold tracking-tight text-white">Gho&amp;Co</span>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            <Link href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-white/40 transition-colors hover:text-white">
              <InstagramIcon className="h-[18px] w-[18px]" />
            </Link>
            <Link href="/login" className="text-sm text-white/50 transition-colors hover:text-white">
              {nav.login}
            </Link>
            <Link href="/portfolio" className="hidden text-sm text-white/50 transition-colors hover:text-white sm:block">
              {nav.portfolio}
            </Link>
            <Link href="/portal" className="hidden text-sm text-white/50 transition-colors hover:text-white sm:block">
              {nav.myOrders}
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black transition-colors hover:bg-white/90"
            >
              {nav.startOrder}
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: GRAIN_SVG, backgroundRepeat: 'repeat' }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 40%, transparent 30%, #0c0c0c 100%)' }}
        />

        <motion.div
          className="relative z-10 mx-auto max-w-4xl text-center"
          variants={stagger(0.1)}
          initial="hidden"
          animate="show"
        >
          <motion.p
            variants={fadeUp}
            className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-white/30"
          >
            {l.tagline}
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="text-[clamp(3rem,10vw,6rem)] font-bold leading-[0.95] tracking-tighter text-white"
            style={{ whiteSpace: 'pre-line' }}
          >
            {l.hero}
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-7 max-w-lg text-lg leading-relaxed text-white/40"
          >
            {l.heroSub}
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              href="/register"
              className="rounded-full bg-white px-8 py-3 text-base font-medium text-black transition-colors hover:bg-white/90"
            >
              {l.ctaPrimary}
            </Link>
            <Link
              href="#products"
              className="rounded-full border border-white/20 px-8 py-3 text-base font-medium text-white/70 transition-colors hover:border-white/40 hover:text-white"
            >
              {l.ctaSecondary}
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <div className="flex h-9 w-5 items-start justify-center rounded-full border border-white/50 pt-1.5">
            <div className="h-1.5 w-0.5 animate-bounce rounded-full bg-white" />
          </div>
        </motion.div>
      </section>

      {/* Products */}
      <section id="products" className="mx-auto max-w-6xl px-6 py-24">
        <motion.div
          variants={stagger(0.06)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          <motion.p variants={fadeUp} className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-white/30">
            {l.whatWeMake}
          </motion.p>
          <motion.h2 variants={fadeUp} className="mb-12 text-3xl font-bold tracking-tighter text-white sm:text-4xl">
            {l.productsHeading}
          </motion.h2>
        </motion.div>

        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          variants={stagger(0.1)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
        >
          {products.map(({ icon: Icon, title, description, href, tag }) => (
            <motion.div key={href} variants={cardVariants}>
              <Link
                href={href}
                className="group relative flex h-full flex-col rounded-2xl border border-white/[0.08] bg-[#141414] p-7 transition-colors duration-300 hover:border-white/20 hover:bg-[#1a1a1a]"
              >
                <motion.div
                  className="absolute inset-0 rounded-2xl opacity-0 shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
                {tag && (
                  <span className="absolute right-5 top-5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-white/40">
                    {tag}
                  </span>
                )}
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/5">
                  <Icon className="h-5 w-5 text-white/70" />
                </div>
                <h3 className="text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-white/40">{description}</p>
                <div className="mt-6 flex items-center gap-1.5 text-sm font-medium text-white/30 transition-all duration-200 group-hover:gap-2.5 group-hover:text-white/70">
                  {t.common.orderNow} <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-6xl px-6">
        <div className="h-px bg-white/[0.06]" />
      </div>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <motion.div
          variants={stagger(0.06)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          <motion.p variants={fadeUp} className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-white/30">
            {l.howItWorks}
          </motion.p>
          <motion.h2 variants={fadeUp} className="mb-16 text-3xl font-bold tracking-tighter text-white sm:text-4xl">
            {l.processHeading}
          </motion.h2>
        </motion.div>

        <motion.div
          className="grid gap-10 sm:grid-cols-3"
          variants={stagger(0.12)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
        >
          {l.steps.map(({ title, desc }, i) => (
            <motion.div key={i} variants={fadeUp}>
              <p className="mb-4 text-5xl font-bold tracking-tighter text-white/[0.08]">0{i + 1}</p>
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/40">{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-white/[0.06] px-6 py-28 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: GRAIN_SVG, backgroundRepeat: 'repeat' }}
        />
        <motion.div
          className="relative mx-auto max-w-2xl"
          variants={stagger(0.1)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tighter text-white sm:text-4xl">
            {l.ctaSection}
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-sm text-base text-white/40">
            {l.ctaSubtext}
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link
              href="/register"
              className="mt-8 inline-flex rounded-full bg-white px-8 py-3 text-base font-medium text-black transition-colors hover:bg-white/90"
            >
              {l.ctaButton}
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Admin shortcut */}
      <Link
        href="/admin"
        className="fixed bottom-6 right-6 z-50 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/30 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white/60"
      >
        {nav.admin}
      </Link>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between text-xs text-white/20">
          <span>{l.footer.copyright.replace('{year}', String(new Date().getFullYear()))}</span>
          <div className="flex items-center gap-6">
            <Link href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 transition-colors hover:text-white/50">
              <InstagramIcon className="h-3.5 w-3.5" />
              {l.footer.instagram}
            </Link>
            <Link href="/login" className="transition-colors hover:text-white/50">{l.footer.login}</Link>
            <Link href="/portal" className="transition-colors hover:text-white/50">{l.footer.portal}</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
