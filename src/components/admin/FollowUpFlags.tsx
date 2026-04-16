'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Clock, Receipt, RefreshCw, Tag } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Flag {
  type: 'stale_quote' | 'stuck_order' | 'overdue_invoice' | 'stale_price'
  label: string
  sub: string
  href: string
  urgency: 'high' | 'medium'
}

export function FollowUpFlags() {
  const [flags, setFlags] = useState<Flag[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRun, setLastRun] = useState<string | null>(null)

  async function run() {
    setLoading(true)
    const [followUpRes, priceRes] = await Promise.all([
      fetch('/api/agents/follow-up'),
      fetch('/api/agents/price-check'),
    ])

    const data = followUpRes.ok ? await followUpRes.json() : {}
    const priceData = priceRes.ok ? await priceRes.json() : {}

    const stalePrices: Flag[] = (priceData.prices ?? [])
      .filter((p: any) => p.stale)
      .slice(0, 3)  // cap at 3 to avoid flooding the panel
      .map((p: any) => ({
        type: 'stale_price' as const,
        label: `Price check — ${p.label}`,
        sub: p.days_since_verified
          ? `Last verified ${p.days_since_verified}d ago — may need updating`
          : 'Never verified — confirm current supplier price',
        href: '/admin/supplier',
        urgency: (p.days_since_verified === null || p.days_since_verified > 60) ? 'high' : 'medium',
      }))

    const all: Flag[] = [
      ...(data.stale_quotes ?? []).map((q: any) => ({
        type: 'stale_quote' as const,
        label: `Quote ${q.quote_number} — ${q.customer ?? 'Unknown'}`,
        sub: `Sent ${q.hours_waiting}h ago, no response · ${formatCurrency(q.total_cents)}`,
        href: `/admin/quotes/${q.quote_id}`,
        urgency: q.hours_waiting > 96 ? 'high' : 'medium',
      })),
      ...(data.stuck_orders ?? []).map((o: any) => ({
        type: 'stuck_order' as const,
        label: `Order ${o.order_number} — ${o.customer ?? 'Unknown'}`,
        sub: `${o.days_waiting}d in "${o.status.replace('_', ' ')}" — needs attention`,
        href: `/admin/orders/${o.order_id}`,
        urgency: o.days_waiting > 5 ? 'high' : 'medium',
      })),
      ...(data.overdue_invoices ?? []).map((inv: any) => ({
        type: 'overdue_invoice' as const,
        label: `Invoice ${inv.invoice_number} — ${inv.customer ?? 'Unknown'}`,
        sub: `${inv.days_overdue}d overdue · ${formatCurrency(inv.total_cents)} unpaid`,
        href: `/admin/invoices/${inv.invoice_id}`,
        urgency: inv.days_overdue > 7 ? 'high' : 'medium',
      })),
      ...stalePrices,
    ]

    setFlags(all)
    setLastRun(new Date().toLocaleTimeString())
    setLoading(false)
  }

  useEffect(() => { run() }, [])

  const Icon = { stale_quote: Clock, stuck_order: AlertTriangle, overdue_invoice: Receipt, stale_price: Tag }

  if (loading) return (
    <div className="rounded-2xl border border-[#d2d2d7] bg-white p-6">
      <p className="text-sm text-[#86868b]">Running follow-up agent…</p>
    </div>
  )

  return (
    <div className="rounded-2xl border border-[#d2d2d7] bg-white">
      <div className="flex items-center justify-between border-b border-[#d2d2d7] px-6 py-4">
        <div>
          <span className="font-semibold text-[#1d1d1f]">Follow-up flags</span>
          {lastRun && <span className="ml-2 text-xs text-[#86868b]">Last checked {lastRun}</span>}
        </div>
        <button onClick={run} className="flex items-center gap-1.5 text-xs text-[#86868b] hover:text-[#1d1d1f] transition-colors">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      <div className="p-6">
        {flags.length === 0 ? (
          <p className="text-sm text-[#86868b]">All clear — no items need attention.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {flags.map((flag, i) => {
              const FlagIcon = Icon[flag.type]
              return (
                <Link
                  key={i}
                  href={flag.href}
                  className="flex items-start gap-3 rounded-xl border border-[#d2d2d7] p-4 transition-all hover:border-[#6e6e73] hover:shadow-sm"
                >
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    flag.urgency === 'high' ? 'bg-red-50' : 'bg-amber-50'
                  }`}>
                    <FlagIcon className={`h-3.5 w-3.5 ${flag.urgency === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1d1d1f]">{flag.label}</p>
                    <p className="mt-0.5 text-xs text-[#86868b]">{flag.sub}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
