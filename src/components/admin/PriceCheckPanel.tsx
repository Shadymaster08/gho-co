'use client'

import { useEffect, useState, useRef } from 'react'
import { ExternalLink, RefreshCw, CheckCircle, AlertTriangle, Clock, Edit2, Check, X } from 'lucide-react'

interface PriceConfig {
  id: string
  label: string
  category: string
  value_cents: number
  unit: string
  supplier: string | null
  supplier_url: string | null
  last_verified_at: string | null
  notes: string | null
  stale: boolean
  days_since_verified: number | null
}

const CATEGORY_LABELS: Record<string, string> = {
  shirts: 'Shirts',
  dtf: 'DTF Transfers',
  filament: '3D Print Filament',
}

const UNIT_LABELS: Record<string, string> = {
  per_unit: 'per unit',
  per_sqin: 'per sq in',
  per_kg: 'per kg',
}

function formatDollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function StaleBadge({ stale, daysAgo }: { stale: boolean; daysAgo: number | null }) {
  if (!stale) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <CheckCircle className="h-3 w-3" /> Verified
        {daysAgo !== null && <span className="text-emerald-500">{daysAgo}d ago</span>}
      </span>
    )
  }
  if (daysAgo === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
        <AlertTriangle className="h-3 w-3" /> Never verified
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
      <Clock className="h-3 w-3" /> {daysAgo}d ago
    </span>
  )
}

function PriceRow({ price, onVerify, onUpdate }: {
  price: PriceConfig
  onVerify: (id: string) => Promise<void>
  onUpdate: (id: string, cents: number) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState((price.value_cents / 100).toFixed(2))
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  async function handleSave() {
    const cents = Math.round(parseFloat(inputVal) * 100)
    if (isNaN(cents) || cents <= 0) return
    setSaving(true)
    await onUpdate(price.id, cents)
    setSaving(false)
    setEditing(false)
  }

  async function handleVerify() {
    setSaving(true)
    await onVerify(price.id)
    setSaving(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setEditing(false); setInputVal((price.value_cents / 100).toFixed(2)) }
  }

  return (
    <tr className="border-b border-[#d2d2d7] last:border-0 hover:bg-[#f5f5f7]/50 transition-colors">
      <td className="py-3 pr-4">
        <p className="text-sm font-medium text-[#1d1d1f]">{price.label}</p>
        {price.notes && <p className="text-xs text-[#86868b]">{price.notes}</p>}
      </td>
      <td className="py-3 pr-4">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-[#86868b]">$</span>
            <input
              ref={inputRef}
              type="number"
              step="0.01"
              min="0"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-24 rounded-lg border border-[#0071e3] px-2 py-1 text-sm text-[#1d1d1f] outline-none"
            />
            <button onClick={handleSave} disabled={saving} className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={() => { setEditing(false); setInputVal((price.value_cents / 100).toFixed(2)) }} className="text-[#86868b] hover:text-[#1d1d1f]">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#1d1d1f]">
              {formatDollars(price.value_cents)}
              <span className="ml-1 text-xs font-normal text-[#86868b]">{UNIT_LABELS[price.unit] ?? price.unit}</span>
            </span>
            <button onClick={() => setEditing(true)} className="text-[#86868b] hover:text-[#1d1d1f] transition-colors">
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </td>
      <td className="py-3 pr-4">
        <StaleBadge stale={price.stale} daysAgo={price.days_since_verified} />
      </td>
      <td className="py-3 pr-4">
        {price.supplier_url ? (
          <a
            href={price.supplier_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#0071e3] hover:underline"
          >
            {price.supplier} <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-xs text-[#86868b]">{price.supplier ?? '—'}</span>
        )}
      </td>
      <td className="py-3 text-right">
        <button
          onClick={handleVerify}
          disabled={saving || !price.stale}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#d2d2d7] px-3 py-1 text-xs font-medium text-[#1d1d1f] transition-all hover:border-[#6e6e73] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          {saving ? 'Saving…' : 'Mark verified'}
        </button>
      </td>
    </tr>
  )
}

export function PriceCheckPanel() {
  const [prices, setPrices] = useState<PriceConfig[]>([])
  const [staleCount, setStaleCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [lastRun, setLastRun] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/agents/price-check')
    if (res.ok) {
      const data = await res.json()
      setPrices(data.prices ?? [])
      setStaleCount(data.stale_count ?? 0)
      setLastRun(new Date().toLocaleTimeString())
    }
    setLoading(false)
  }

  async function handleVerify(id: string) {
    const res = await fetch('/api/agents/price-check', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      const updated = await res.json()
      setPrices(prev => prev.map(p => p.id === id ? {
        ...p,
        last_verified_at: updated.last_verified_at,
        stale: false,
        days_since_verified: 0,
      } : p))
      setStaleCount(prev => Math.max(0, prev - 1))
    }
  }

  async function handleUpdate(id: string, cents: number) {
    const res = await fetch('/api/agents/price-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, value_cents: cents }),
    })
    if (res.ok) {
      const updated = await res.json()
      setPrices(prev => prev.map(p => p.id === id ? {
        ...p,
        value_cents: updated.value_cents,
        last_verified_at: updated.last_verified_at,
        stale: false,
        days_since_verified: 0,
      } : p))
      setStaleCount(prev => {
        const wasStale = prices.find(p => p.id === id)?.stale
        return wasStale ? Math.max(0, prev - 1) : prev
      })
    }
  }

  useEffect(() => { load() }, [])

  const grouped = Object.entries(CATEGORY_LABELS).map(([cat, label]) => ({
    cat,
    label,
    rows: prices.filter(p => p.category === cat),
  })).filter(g => g.rows.length > 0)

  return (
    <div className="rounded-2xl border border-[#d2d2d7] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#d2d2d7] px-6 py-4">
        <div>
          <span className="font-semibold text-[#1d1d1f]">Supplier Price Monitor</span>
          {lastRun && <span className="ml-2 text-xs text-[#86868b]">Last checked {lastRun}</span>}
          {staleCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              <AlertTriangle className="h-3 w-3" /> {staleCount} stale
            </span>
          )}
          {!loading && staleCount === 0 && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <CheckCircle className="h-3 w-3" /> All prices current
            </span>
          )}
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-[#86868b] hover:text-[#1d1d1f] transition-colors">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Body */}
      <div className="px-6 py-4">
        {loading ? (
          <p className="text-sm text-[#86868b]">Loading prices…</p>
        ) : prices.length === 0 ? (
          <p className="text-sm text-[#86868b]">
            No prices found. Run migration <code className="rounded bg-[#f5f5f7] px-1 text-xs">003_pricing_config.sql</code> in Supabase.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {grouped.map(({ cat, label, rows }) => (
              <div key={cat}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#86868b]">{label}</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#d2d2d7] text-left">
                      <th className="pb-2 text-xs font-medium text-[#86868b]">Item</th>
                      <th className="pb-2 text-xs font-medium text-[#86868b]">Price</th>
                      <th className="pb-2 text-xs font-medium text-[#86868b]">Status</th>
                      <th className="pb-2 text-xs font-medium text-[#86868b]">Supplier</th>
                      <th className="pb-2 text-right text-xs font-medium text-[#86868b]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(price => (
                      <PriceRow
                        key={price.id}
                        price={price}
                        onVerify={handleVerify}
                        onUpdate={handleUpdate}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="border-t border-[#d2d2d7] px-6 py-3">
        <p className="text-xs text-[#86868b]">
          Prices older than 30 days are flagged as stale. Click supplier links to verify current pricing, then mark as verified or update the value.
        </p>
      </div>
    </div>
  )
}
