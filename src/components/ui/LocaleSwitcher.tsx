'use client'

import { useLocale } from '@/lib/i18n/LocaleContext'

export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale()

  return (
    <div className={`flex items-center gap-0.5 ${className ?? ''}`}>
      <button
        onClick={() => locale !== 'en' && setLocale('en')}
        className={`rounded px-1.5 py-0.5 text-xs font-semibold transition-colors ${
          locale === 'en'
            ? 'text-white'
            : 'text-white/30 hover:text-white/60'
        }`}
      >
        EN
      </button>
      <span className="text-white/20 text-xs">|</span>
      <button
        onClick={() => locale !== 'fr' && setLocale('fr')}
        className={`rounded px-1.5 py-0.5 text-xs font-semibold transition-colors ${
          locale === 'fr'
            ? 'text-white'
            : 'text-white/30 hover:text-white/60'
        }`}
      >
        FR
      </button>
    </div>
  )
}

export function LocaleSwitcherLight({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale()

  return (
    <div className={`flex items-center gap-0.5 ${className ?? ''}`}>
      <button
        onClick={() => locale !== 'en' && setLocale('en')}
        className={`rounded px-1.5 py-0.5 text-xs font-semibold transition-colors ${
          locale === 'en'
            ? 'text-[#1d1d1f]'
            : 'text-[#86868b] hover:text-[#1d1d1f]'
        }`}
      >
        EN
      </button>
      <span className="text-[#d2d2d7] text-xs">|</span>
      <button
        onClick={() => locale !== 'fr' && setLocale('fr')}
        className={`rounded px-1.5 py-0.5 text-xs font-semibold transition-colors ${
          locale === 'fr'
            ? 'text-[#1d1d1f]'
            : 'text-[#86868b] hover:text-[#1d1d1f]'
        }`}
      >
        FR
      </button>
    </div>
  )
}
