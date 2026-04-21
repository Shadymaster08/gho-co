'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

const PIPELINE_LABELS: Record<string, string> = {
  received:      'Received',
  in_review:     'In Review',
  quoted:        'Quoted',
  approved:      'Approved',
  in_production: 'In Production',
  shipped:       'Shipped',
}

const PIPELINE_COLORS: Record<string, string> = {
  received:      'bg-blue-500',
  in_review:     'bg-yellow-500',
  quoted:        'bg-purple-500',
  approved:      'bg-green-500',
  in_production: 'bg-orange-500',
  shipped:       'bg-teal-500',
}

interface Digest {
  new_today: number
  pipeline: Record<string, number>
  invoiced_cents: number
  collected_cents: number
  outstanding_cents: number
  draft_quotes: number
  stale_quotes: { id: string; quote_number: string; customer: string; order_number: string; hours: number; total_cents: number }[]
  stuck_orders: { id: string; order_number: string; status: string; customer: string; days: number }[]
  overdue_invoices: { id: string; invoice_number: string; customer: string; order_number: string; due_date: string; days_overdue: number; total_cents: number }[]
  total_flags: number
}

export function DailyDigestPanel() {
  const [digest, setDigest] = useState<Digest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/agents/daily-digest')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setDigest(d); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-32 mb-4" />
      <div className="h-20 bg-gray-50 rounded" />
    </div>
  )

  if (!digest) return null

  const totalActive = Object.values(digest.pipeline).reduce((s, v) => s + v, 0)

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Business Overview</h2>
        <span className="text-xs text-gray-400">
          {new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">

        {/* Revenue */}
        <div className="px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Revenue this month</p>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Invoiced</span>
              <span className="font-medium text-gray-900">{formatCurrency(digest.invoiced_cents)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Collected</span>
              <span className="font-medium text-green-600">{formatCurrency(digest.collected_cents)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-100 pt-2 mt-1">
              <span className="text-gray-500">Outstanding</span>
              <span className={`font-semibold ${digest.outstanding_cents > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                {formatCurrency(digest.outstanding_cents)}
              </span>
            </div>
          </div>
        </div>

        {/* Pipeline */}
        <div className="px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
            Order pipeline <span className="text-gray-300 font-normal">({totalActive} active)</span>
          </p>
          <div className="flex flex-col gap-1.5">
            {Object.entries(digest.pipeline).map(([status, count]) => (
              count > 0 ? (
                <div key={status} className="flex items-center gap-2 text-sm">
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${PIPELINE_COLORS[status]}`} />
                  <span className="text-gray-600 flex-1">{PIPELINE_LABELS[status]}</span>
                  <span className="font-semibold text-gray-900">{count}</span>
                </div>
              ) : null
            ))}
            {totalActive === 0 && <p className="text-sm text-gray-400">No active orders.</p>}
          </div>
          {digest.draft_quotes > 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-gray-300 flex-shrink-0" />
              <span className="text-gray-400 flex-1">Draft quotes</span>
              <Link href="/admin/quotes" className="font-semibold text-yellow-600 hover:underline">{digest.draft_quotes}</Link>
            </div>
          )}
        </div>

        {/* Action items */}
        <div className="px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
            Action needed
            {digest.total_flags > 0 && (
              <span className="ml-2 rounded-full bg-red-100 text-red-600 px-1.5 py-0.5 text-xs font-bold">
                {digest.total_flags}
              </span>
            )}
          </p>

          {digest.total_flags === 0 && (
            <p className="text-sm text-green-600 font-medium">✓ All caught up</p>
          )}

          <div className="flex flex-col gap-2">
            {digest.stuck_orders.map(o => (
              <Link key={o.id} href={`/admin/orders/${o.id}`} className="block rounded-lg bg-yellow-50 border border-yellow-100 px-3 py-2 hover:bg-yellow-100 transition-colors">
                <p className="text-xs font-semibold text-yellow-800">{o.order_number} · {o.status.replace('_', ' ')}</p>
                <p className="text-xs text-yellow-600">{o.customer} · {o.days}d waiting</p>
              </Link>
            ))}

            {digest.stale_quotes.map(q => (
              <Link key={q.id} href={`/admin/quotes/${q.id}`} className="block rounded-lg bg-yellow-50 border border-yellow-100 px-3 py-2 hover:bg-yellow-100 transition-colors">
                <p className="text-xs font-semibold text-yellow-800">{q.quote_number} · no response</p>
                <p className="text-xs text-yellow-600">{q.customer} · {q.hours}h · {formatCurrency(q.total_cents)}</p>
              </Link>
            ))}

            {digest.overdue_invoices.map(i => (
              <Link key={i.id} href={`/admin/invoices/${i.id}`} className="block rounded-lg bg-red-50 border border-red-100 px-3 py-2 hover:bg-red-100 transition-colors">
                <p className="text-xs font-semibold text-red-700">{i.invoice_number} · overdue {i.days_overdue}d</p>
                <p className="text-xs text-red-500">{i.customer} · {formatCurrency(i.total_cents)}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
