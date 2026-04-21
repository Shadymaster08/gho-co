'use client'

import { useEffect, useState } from 'react'
import {
  TrendingUp,
  Sparkles,
  AlertTriangle,
  ExternalLink,
  Lightbulb,
  Hash,
  MessageSquareQuote,
  Shirt,
  Box,
  Wrench,
  Lamp,
  Clock,
} from 'lucide-react'

type Category = 'shirts' | '3d_prints' | 'diy' | 'lighting'

interface Listing {
  title: string
  shop: string
  price_usd: number | null
  review_count: number | null
  url: string
  thumbnail_url: string | null
  why_it_works: string
  profit_potential: 'low' | 'medium' | 'high' | null
  profit_note: string | null
}

interface CategoryReport {
  category: Category
  trending_themes: string[]
  hot_keywords: string[]
  top_listings: Listing[]
  style_insights: string
  design_ideas_for_you: string[]
}

interface Report {
  id: string
  ran_at: string
  findings: CategoryReport[]
  total_listings: number
  triggered_by: string
}

const CATEGORY_META: Record<Category, { label: string; icon: typeof Shirt; color: string }> = {
  shirts: { label: 'Shirts', icon: Shirt, color: 'text-indigo-600' },
  '3d_prints': { label: '3D Prints', icon: Box, color: 'text-emerald-600' },
  diy: { label: 'DIY', icon: Wrench, color: 'text-amber-600' },
  lighting: { label: 'Lighting', icon: Lamp, color: 'text-rose-600' },
}

const CATEGORIES: Category[] = ['shirts', '3d_prints', 'diy', 'lighting']

export function EtsyTrendsPanel() {
  const [reports, setReports] = useState<Report[]>([])
  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<Category>('shirts')
  const [activeReportId, setActiveReportId] = useState<string | null>(null)

  async function loadReports() {
    setLoading(true)
    try {
      const res = await fetch('/api/agents/etsy-trends')
      if (res.ok) {
        const data = await res.json()
        setReports(data.reports ?? [])
        if (data.reports?.length > 0) setActiveReportId(data.reports[0].id)
      }
    } catch {
      setError('Failed to load reports')
    }
    setLoading(false)
  }

  async function runScan() {
    setRunning(true)
    setError(null)
    try {
      const res = await fetch('/api/agents/etsy-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggered_by: 'manual' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Scan failed')
        setRunning(false)
        return
      }
      await loadReports()
      if (data.report_id) setActiveReportId(data.report_id)
    } catch {
      setError('Network error — try again')
    }
    setRunning(false)
  }

  useEffect(() => {
    loadReports()
  }, [])

  const activeReport = reports.find(r => r.id === activeReportId) ?? reports[0] ?? null
  const currentCategoryReport = activeReport?.findings.find(f => f.category === activeCategory)

  return (
    <div className="rounded-2xl border border-[#d2d2d7] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#d2d2d7] px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#0071e3]" />
            <span className="font-semibold text-[#1d1d1f]">Etsy Trend Analyzer</span>
          </div>
          <p className="mt-0.5 text-xs text-[#86868b]">
            Claude browses Etsy bestsellers to surface trends, keywords, and design ideas for you.
            {activeReport && (
              <span className="ml-2">
                · Last run{' '}
                {new Date(activeReport.ran_at).toLocaleDateString('en-CA', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={runScan}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0077ed] disabled:opacity-60"
        >
          {running ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Scanning…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Run trend scan
            </>
          )}
        </button>
      </div>

      {/* Body */}
      <div className="p-6">
        {running && (
          <div className="mb-4 rounded-xl bg-[#f5f5f7] p-4">
            <p className="text-sm font-medium text-[#1d1d1f]">Browsing Etsy and analysing trends…</p>
            <p className="mt-1 text-xs text-[#86868b]">
              Claude is running 12 searches across your 4 product categories. This usually takes 1–2 minutes.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && !running ? (
          <p className="text-sm text-[#86868b]">Loading reports…</p>
        ) : !activeReport ? (
          <div className="rounded-xl border border-dashed border-[#d2d2d7] p-10 text-center">
            <TrendingUp className="mx-auto mb-3 h-8 w-8 text-[#d2d2d7]" />
            <p className="text-sm font-medium text-[#1d1d1f]">No trend reports yet</p>
            <p className="mt-1 text-xs text-[#86868b]">
              Click &ldquo;Run trend scan&rdquo; to get your first report. Requires migration 007 in Supabase.
            </p>
          </div>
        ) : (
          <>
            {/* Report selector (if multiple) */}
            {reports.length > 1 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-[#86868b]" />
                <span className="text-xs text-[#86868b]">Viewing report from:</span>
                {reports.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setActiveReportId(r.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      r.id === activeReport.id
                        ? 'bg-[#1d1d1f] text-white'
                        : 'bg-[#f5f5f7] text-[#6e6e73] hover:bg-[#e8e8ed]'
                    }`}
                  >
                    {new Date(r.ran_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                  </button>
                ))}
              </div>
            )}

            {/* Category tabs */}
            <div className="mb-6 flex gap-1 rounded-full bg-[#f5f5f7] p-1">
              {CATEGORIES.map(cat => {
                const { label, icon: Icon } = CATEGORY_META[cat]
                const active = cat === activeCategory
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-white text-[#1d1d1f] shadow-sm'
                        : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                )
              })}
            </div>

            {/* Category content */}
            {currentCategoryReport ? (
              <CategoryView data={currentCategoryReport} />
            ) : (
              <p className="text-sm text-[#86868b]">No data for this category yet.</p>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#d2d2d7] px-6 py-3">
        <p className="text-xs text-[#86868b]">
          Insights are AI-generated from live Etsy search results. Review counts are used as a proxy for sales volume.
          Run every 1–2 weeks to stay on top of shifts in taste.
        </p>
      </div>
    </div>
  )
}

function CategoryView({ data }: { data: CategoryReport }) {
  const { icon: Icon, color } = CATEGORY_META[data.category]

  return (
    <div className="flex flex-col gap-6">
      {/* Style insights + trending themes card */}
      <div className="rounded-2xl border border-[#d2d2d7] bg-gradient-to-br from-[#fafafa] to-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <MessageSquareQuote className={`h-4 w-4 ${color}`} />
          <span className="text-xs font-semibold uppercase tracking-wide text-[#6e6e73]">
            What&apos;s winning
          </span>
        </div>
        <p className="text-[15px] leading-relaxed text-[#1d1d1f]">
          {data.style_insights || 'No style insights yet — run a scan.'}
        </p>
        {data.trending_themes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {data.trending_themes.map(theme => (
              <span
                key={theme}
                className="rounded-full bg-[#1d1d1f] px-3 py-1 text-xs font-medium text-white"
              >
                {theme}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Design ideas for you */}
      {data.design_ideas_for_you.length > 0 && (
        <div className="rounded-2xl border border-[#0071e3]/20 bg-[#0071e3]/[0.04] p-5">
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-[#0071e3]" />
            <span className="text-xs font-semibold uppercase tracking-wide text-[#0071e3]">
              Ideas for you
            </span>
          </div>
          <ul className="flex flex-col gap-2.5">
            {data.design_ideas_for_you.map((idea, i) => (
              <li key={i} className="flex gap-3 text-sm text-[#1d1d1f]">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0071e3] text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{idea}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hot keywords */}
      {data.hot_keywords.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Hash className="h-4 w-4 text-[#86868b]" />
            <span className="text-xs font-semibold uppercase tracking-wide text-[#6e6e73]">
              Hot keywords
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.hot_keywords.map(kw => (
              <button
                key={kw}
                onClick={() => navigator.clipboard?.writeText(kw)}
                title="Click to copy"
                className="rounded-full border border-[#d2d2d7] bg-white px-3 py-1 text-xs text-[#1d1d1f] transition-colors hover:border-[#1d1d1f] hover:bg-[#f5f5f7]"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bestsellers grid */}
      {data.top_listings.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Icon className={`h-4 w-4 ${color}`} />
            <span className="text-xs font-semibold uppercase tracking-wide text-[#6e6e73]">
              Bestsellers Claude found
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.top_listings.map((l, i) => (
              <ListingCard key={`${l.url}-${i}`} listing={l} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#d2d2d7] p-6 text-center text-sm text-[#86868b]">
          No listings extracted for this category — re-run the scan.
        </div>
      )}
    </div>
  )
}

const PROFIT_BADGE: Record<'low' | 'medium' | 'high', { label: string; classes: string }> = {
  high:   { label: 'High profit',   classes: 'bg-emerald-50 text-emerald-700' },
  medium: { label: 'Medium profit', classes: 'bg-amber-50 text-amber-700' },
  low:    { label: 'Low profit',    classes: 'bg-red-50 text-red-600' },
}

function ListingCard({ listing }: { listing: Listing }) {
  const { title, shop, price_usd, review_count, url, thumbnail_url, why_it_works, profit_potential, profit_note } = listing
  const profitMeta = profit_potential ? PROFIT_BADGE[profit_potential] : null

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-2xl border border-[#d2d2d7] bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-[#1d1d1f] hover:shadow-sm"
    >
      <div className="flex gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f5f5f7]">
          {thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnail_url} alt={title} className="h-full w-full object-cover" />
          ) : (
            <TrendingUp className="h-5 w-5 text-[#d2d2d7]" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="line-clamp-2 text-sm font-medium text-[#1d1d1f] group-hover:text-[#0071e3]">
            {title}
          </p>
          <p className="mt-0.5 truncate text-xs text-[#86868b]">{shop}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {price_usd !== null && (
              <span className="font-semibold text-[#1d1d1f]">${price_usd.toFixed(2)} USD</span>
            )}
            {review_count !== null && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                {review_count.toLocaleString()} reviews
              </span>
            )}
            {profitMeta && (
              <span className={`rounded-full px-2 py-0.5 font-semibold ${profitMeta.classes}`}>
                {profitMeta.label}
              </span>
            )}
            <ExternalLink className="h-3 w-3 text-[#86868b]" />
          </div>
        </div>
      </div>
      {why_it_works && (
        <p className="mt-3 border-t border-[#f5f5f7] pt-3 text-xs italic text-[#6e6e73]">
          {why_it_works}
        </p>
      )}
      {profit_note && (
        <p className="mt-1.5 text-xs text-[#86868b]">
          {profit_note}
        </p>
      )}
    </a>
  )
}
