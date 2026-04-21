import { cookies } from 'next/headers'
import { translations, type Locale, type Translations } from './translations'

export { translations, type Locale, type Translations }

export const LOCALE_COOKIE = 'locale'
export const DEFAULT_LOCALE: Locale = 'en'

export async function getLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies()
    const val = cookieStore.get(LOCALE_COOKIE)?.value
    if (val === 'en' || val === 'fr') return val
  } catch {
    // cookies() throws outside request context — fall back gracefully
  }
  return DEFAULT_LOCALE
}

export function t(locale: Locale): Translations {
  return translations[locale]
}
