'use client'

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Percent, Package } from 'lucide-react'

interface Summary {
  total_revenue_cents: number
  total_cost_cents: number
  total_profit_cents: number
  avg_margin_pct: number
  target_margin_pct: number
  at_risk_count: number
  total_quotes: number
}

interface MonthlyData {
  month: string
  label: string
  revenue_cents: number
  cost_cents: number
  profit_cents: number
  margin_pct: number
  count: number
}

interface QuoteRow {
  id: string
  quote_number: string
  product_type: string
  date: string
  quoted_revenue_cents: number
  quoted_cost_cents: number
  quoted_margin_pct: number
  live_margin_pct: number
  margin_slippage_pct: number
  at_risk: boolean
}

function fmt(cents: number) {
  return (cents / 100).toLocaleString('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })
}

function productLabel(type: string) {
  return { shirt: 'Shirts', '3d_print': '3D Prints', diy: 'DIY', lighting: 'Lighting' }[type] ?? type
}

const BRAND_BLUE = '#0071e3'
const PROFIT_GREEN = '#34c759'
const COST_RED = '#ff3b30'
const AMBER = '#ff9500'
const MUTED = '#d2d2d7'

// Custom tooltip for bar chart
function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const revenue = payload.find((p: any) => p.dataKey === 'revenue_cents')?.value ?? 0
  const cost    = payload.find((p: any) => p.dataKey === 'cost_cents')?.value ?? 0
  const profit  = revenue - cost
  const margin  = revenue > 0 ? Math.round((profit / revenue) * 100) : 0
  return (
    <div className="rounded-xl border border-[#d2d2d7] bg-white p-3 shadow-lg text-xs">
      <p className="mb-2 font-semibold text-[#1d1d1f]">{label}</p>
      <p className="text-[#0071e3]">Revenue: {fmt(revenue)}</p>
      <p className="text-[#ff3b30]">Cost: {fmt(cost)}</p>
      <p className="font-semibold text-[#34c759]">Profit: {fmt(profit)} ({margin}%)</p>
    </div>
  )
}

function MarginTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-[#d2d2d7] bg-white p-3 shadow-lg text-xs">
      <p className="mb-1 font-semibold text-[#1d1d1f]">{label}</p>
      <p>Margin: <span className="font-semibold">{payload[0]?.value}%</span></p>
    </div>
  )
}

export function ProfitEstimator() {
  const [data, setData] = useState<{ summary: Summary; monthly: MonthlyData[]; quotes: QuoteRow[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/agents/profit-estimator')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Failed to load profit data'); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center rounded-2xl border border-[#d2d2d7] bg-white p-12">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#d2d2d7] border-t-[#0071e3]" />
    </div>
  )

  if (error || !data) return (
    <div className="rounded-2xl border border-[#d2d2d7] bg-white p-6 text-sm text-[#86868b]">{error ?? 'No data'}</div>
  )

  const { summary, monthly, quotes } = data
  const marginOk = summary.avg_margin_pct >= summary.target_margin_pct - 3
  const marginColor = summary.avg_margin_pct >= summary.target_margin_pct ? 'text-[#34c759]'
    : summary.avg_margin_pct >= summary.target_margin_pct - 5 ? 'text-[#ff9500]'
    : 'text-[#ff3b30]'

  const statCards = [
    {
      label: 'Total revenue',
      value: fmt(summary.total_revenue_cents),
      sub: `${summary.total_quotes} quotes`,
      icon: DollarSign,
      color: 'text-[#0071e3]',
      bg: 'bg-[#0071e3]/8',
    },
    {
      label: 'Total profit',
      value: fmt(summary.total_profit_cents),
      sub: `After materials + labour`,
      icon: TrendingUp,
      color: 'text-[#34c759]',
      bg: 'bg-[#34c759]/8',
    },
    {
      label: 'Avg margin',
      value: `${summary.avg_margin_pct}%`,
      sub: `Target: ${summary.target_margin_pct}%`,
      icon: Percent,
      color: marginColor,
      bg: marginOk ? 'bg-[#34c759]/8' : 'bg-[#ff9500]/8',
    },
    {
      label: 'At risk',
      value: String(summary.at_risk_count),
      sub: 'Cost slippage ≥5%',
      icon: AlertTriangle,
      color: summary.at_risk_count > 0 ? 'text-[#ff9500]' : 'text-[#86868b]',
      bg: summary.at_risk_count > 0 ? 'bg-[#ff9500]/8' : 'bg-[#f5f5f7]',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="flex items-start gap-4 rounded-2xl border border-[#d2d2d7] bg-white p-5">
            <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-[#86868b]">{label}</p>
              <p className={`mt-0.5 text-2xl font-bold ${color}`}>{value}</p>
              <p className="mt-0.5 text-xs text-[#86868b]">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {monthly.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Revenue vs Cost bar chart */}
          <div className="rounded-2xl border border-[#d2d2d7] bg-white p-6">
            <h3 className="mb-1 text-sm font-semibold text-[#1d1d1f]">Revenue vs Cost</h3>
            <p className="mb-6 text-xs text-[#86868b]">Last 6 months — accepted quotes</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#86868b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={v => `$${(v / 100).toLocaleString('en-CA', { notation: 'compact' })}`}
                  tick={{ fontSize: 11, fill: '#86868b' }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip content={<RevenueTooltip />} cursor={{ fill: '#f5f5f7' }} />
                <Bar dataKey="revenue_cents" name="Revenue" fill={BRAND_BLUE} radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost_cents" name="Cost" fill={MUTED} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-center gap-6 text-xs text-[#86868b]">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#0071e3]" /> Revenue</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#d2d2d7]" /> Cost</span>
            </div>
          </div>

          {/* Margin % trend */}
          <div className="rounded-2xl border border-[#d2d2d7] bg-white p-6">
            <h3 className="mb-1 text-sm font-semibold text-[#1d1d1f]">Margin trend</h3>
            <p className="mb-6 text-xs text-[#86868b]">Monthly average — target {summary.target_margin_pct}%</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#86868b' }} axisLine={false} tickLine={false} />
                <YAxis
                  domain={[0, 60]}
                  tickFormatter={v => `${v}%`}
                  tick={{ fontSize: 11, fill: '#86868b' }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip content={<MarginTooltip />} cursor={{ stroke: '#d2d2d7' }} />
                <ReferenceLine
                  y={summary.target_margin_pct}
                  stroke={AMBER}
                  strokeDasharray="4 4"
                  label={{ value: `Target ${summary.target_margin_pct}%`, fill: AMBER, fontSize: 10, position: 'insideTopRight' }}
                />
                <Line
                  dataKey="margin_pct"
                  stroke={BRAND_BLUE}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: BRAND_BLUE, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Per-quote breakdown */}
      {quotes.length > 0 && (
        <div className="rounded-2xl border border-[#d2d2d7] bg-white">
          <div className="border-b border-[#f5f5f7] px-6 py-4">
            <h3 className="text-sm font-semibold text-[#1d1d1f]">Quote breakdown</h3>
            <p className="text-xs text-[#86868b]">Recent accepted quotes — live cost vs quoted margin</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#f5f5f7] text-left">
                  <th className="px-6 py-3 font-medium text-[#86868b]">Quote</th>
                  <th className="px-6 py-3 font-medium text-[#86868b]">Type</th>
                  <th className="px-6 py-3 font-medium text-[#86868b]">Revenue</th>
                  <th className="px-6 py-3 font-medium text-[#86868b]">Cost (quoted)</th>
                  <th className="px-6 py-3 font-medium text-[#86868b]">Margin</th>
                  <th className="px-6 py-3 font-medium text-[#86868b]">Live margin</th>
                  <th className="px-6 py-3 font-medium text-[#86868b]">Slippage</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map(q => (
                  <tr key={q.id} className={`border-b border-[#f5f5f7] last:border-0 ${q.at_risk ? 'bg-[#ff9500]/4' : ''}`}>
                    <td className="px-6 py-3 font-medium text-[#1d1d1f]">
                      <div className="flex items-center gap-2">
                        {q.at_risk && <AlertTriangle className="h-3.5 w-3.5 text-[#ff9500]" />}
                        {q.quote_number}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-[#6e6e73]">{productLabel(q.product_type)}</td>
                    <td className="px-6 py-3 text-[#1d1d1f]">{fmt(q.quoted_revenue_cents)}</td>
                    <td className="px-6 py-3 text-[#6e6e73]">{q.quoted_cost_cents > 0 ? fmt(q.quoted_cost_cents) : '—'}</td>
                    <td className="px-6 py-3">
                      <MarginBadge pct={q.quoted_margin_pct} target={35} />
                    </td>
                    <td className="px-6 py-3">
                      <MarginBadge pct={q.live_margin_pct} target={35} />
                    </td>
                    <td className="px-6 py-3">
                      {q.margin_slippage_pct === 0 ? (
                        <span className="text-[#86868b]">—</span>
                      ) : (
                        <span className={`font-medium ${q.margin_slippage_pct > 0 ? 'text-[#ff9500]' : 'text-[#34c759]'}`}>
                          {q.margin_slippage_pct > 0 ? '−' : '+'}{Math.abs(q.margin_slippage_pct)}%
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {quotes.length === 0 && monthly.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d2d2d7] bg-white py-16 text-center">
          <Package className="mb-3 h-8 w-8 text-[#d2d2d7]" />
          <p className="text-sm font-medium text-[#1d1d1f]">No accepted quotes yet</p>
          <p className="mt-1 text-xs text-[#86868b]">Profit data will appear once quotes are accepted.</p>
        </div>
      )}
    </div>
  )
}

function MarginBadge({ pct, target }: { pct: number; target: number }) {
  if (pct === 0) return <span className="text-[#86868b]">—</span>
  const color = pct >= target ? 'text-[#34c759] bg-[#34c759]/10'
    : pct >= target - 5 ? 'text-[#ff9500] bg-[#ff9500]/10'
    : 'text-[#ff3b30] bg-[#ff3b30]/10'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {pct}%
    </span>
  )
}
