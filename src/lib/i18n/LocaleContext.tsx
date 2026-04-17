'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { type Locale, type Translations, translations } from './translations'

const LOCALE_COOKIE = 'locale'
const DEFAULT_LOCALE: Locale = 'en'

interface LocaleContextValue {
  locale: Locale
  t: Translations
  setLocale: (l: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en' as Locale,
  t: translations['en'],
  setLocale: () => {},
})

export function LocaleProvider({ children, initial }: { children: ReactNode; initial: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initial)

  function setLocale(l: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${l};path=/;max-age=31536000;samesite=lax`
    setLocaleState(l)
    window.location.reload()
  }

  return (
    <LocaleContext.Provider value={{ locale, t: translations[locale], setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
