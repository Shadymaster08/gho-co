'use client'

import { useState } from 'react'
import { useLocale } from '@/lib/i18n/LocaleContext'

interface PortfolioImage {
  id: string
  title: string | null
  product_type: string | null
  generated_public_url: string
}

const CATEGORY_KEYS = ['shirt', '3d_print', 'lighting'] as const
type CategoryKey = typeof CATEGORY_KEYS[number]

const CATEGORY_LABELS: Record<string, { en: string; fr: string }> = {
  shirt:    { en: 'Shirts', fr: 'Vêtements' },
  '3d_print': { en: '3D Prints', fr: 'Impressions 3D' },
  lighting: { en: 'Lighting', fr: 'Éclairage' },
}

export default function PortfolioGallery({ images, noItems, cta, ctaButton }: {
  images: PortfolioImage[]
  noItems: string
  cta: string
  ctaButton: string
}) {
  const { locale } = useLocale()

  const availableCategories = CATEGORY_KEYS.filter(k =>
    images.some(img => img.product_type === k)
  )

  const [active, setActive] = useState<CategoryKey | null>(
    availableCategories[0] ?? null
  )

  const filtered = active ? images.filter(img => img.product_type === active) : images

  if (!images.length) {
    return (
      <div className="py-24 text-center">
        <p className="text-white/20">{noItems}</p>
      </div>
    )
  }

  return (
    <>
      {/* Category tabs */}
      {availableCategories.length > 1 && (
        <div className="mb-10 flex gap-2 overflow-x-auto pb-1">
          {availableCategories.map(key => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`shrink-0 rounded-full border px-5 py-2 text-sm font-medium transition-colors ${
                active === key
                  ? 'border-white bg-white text-black'
                  : 'border-white/10 text-white/40 hover:border-white/30 hover:text-white/70'
              }`}
            >
              {CATEGORY_LABELS[key]?.[locale] ?? key}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {filtered.map(img => (
          <div key={img.id} className="mb-4 break-inside-avoid overflow-hidden rounded-2xl bg-[#141414]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.generated_public_url}
              alt={img.title ?? 'Portfolio item'}
              className="w-full object-cover"
              loading="lazy"
            />
            {img.title && (
              <div className="px-5 py-4">
                <p className="text-sm font-medium text-white">{img.title}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-20 text-center">
        <p className="text-sm text-white/30">{cta}</p>
        <a
          href="/#products"
          className="mt-4 inline-flex rounded-full bg-white px-8 py-3 text-sm font-medium text-black transition-colors hover:bg-white/90"
        >
          {ctaButton}
        </a>
      </div>
    </>
  )
}
