'use client'

import { useRef, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { Calculator, ExternalLink, Upload, Loader2, TrendingUp, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// 35% gross margin → multiplier = 1 / (1 - 0.35)
const MARGIN = 0.35
const MULTIPLIER = 1 / (1 - MARGIN)

// Fabrik.ca approximate per-unit costs (CAD)
const SHIRT_BASE_COSTS: Record<string, number> = {
  't-shirt-standard':   3.10,
  't-shirt-premium':    4.50,
  'longsleeve':         6.50,
  'hoodie':            18.00,
  'crewneck':          14.00,
  'polo':               8.00,
  'tank-top':           4.00,
}

const SHIRT_SIZE_UPCHARGE: Record<string, number> = {
  XS: 0, S: 0, M: 0, L: 0, XL: 0,
  '2XL': 1.00, '3XL': 2.00,
}

// Bambu Lab filament $/kg (CAD approximate)
const FILAMENT_COSTS: Record<string, number> = {
  'PLA (Bambu)':   29,
  'PLA (Generic)': 18,
  'PETG':          22,
  'ABS':           24,
  'TPU':           32,
  'ASA':           26,
  'Resin':         45,
}

function applyMargin(costCents: number): number {
  return Math.ceil(costCents * MULTIPLIER)
}

function profitCents(costCents: number, revenueCents: number): number {
  return revenueCents - costCents
}

interface CalcResult {
  materialCostCents: number
  suggestedPriceCents: number
  profitCents: number
  description: string
}

interface PricingCalculatorProps {
  productType: 'shirt' | '3d_print' | 'diy' | 'lighting' | null
  onApply?: (result: CalcResult) => void
}

export function PricingCalculator({ productType, onApply }: PricingCalculatorProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-5 py-3 text-sm font-semibold text-indigo-700"
      >
        <span className="flex items-center gap-2"><Calculator className="h-4 w-4" /> Pricing Calculator (35% margin)</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-indigo-100 px-5 pb-5 pt-4">
          {productType === 'shirt' && <ShirtCalculator onApply={onApply} />}
          {productType === '3d_print' && <PrintCalculator onApply={onApply} />}
          {(productType === 'diy' || productType === 'lighting' || !productType) && <CustomCalculator onApply={onApply} />}
        </div>
      )}
    </div>
  )
}

// ── Shirt Calculator ────────────────────────────────────────────────────────

const LABOR_RATE = 50        // $50/hr — calibrated to hit $20-22/shirt on a pocket-front + full-back DTF order
const SHIRTS_PER_HOUR = 10   // 1 hr per 10 shirts
const OVERHEAD_RATE = 0.15   // 15% overhead contingency

function ShirtCalculator({ onApply }: { onApply?: (r: CalcResult) => void }) {
  const [garment, setGarment] = useState('t-shirt-standard')
  const [quantity, setQuantity] = useState(10)
  const [dtfWidth, setDtfWidth] = useState(12)
  const [dtfHeight, setDtfHeight] = useState(12)
  const [addBack, setAddBack] = useState(false)
  const [dtfBackWidth, setDtfBackWidth] = useState(12)
  const [dtfBackHeight, setDtfBackHeight] = useState(12)
  const [avgSize, setAvgSize] = useState<keyof typeof SHIRT_SIZE_UPCHARGE>('L')

  // 1. Material costs
  const shirtUnitCost  = (SHIRT_BASE_COSTS[garment] ?? 3.10) + (SHIRT_SIZE_UPCHARGE[avgSize] ?? 0)
  const dtfFrontCost   = dtfWidth * dtfHeight * 0.02
  const dtfBackCost    = addBack ? dtfBackWidth * dtfBackHeight * 0.02 : 0
  const unitMaterialCost   = shirtUnitCost + dtfFrontCost + dtfBackCost
  const totalMaterialCost  = unitMaterialCost * quantity

  // 2. Labor: $25/hr, 1 hr per 10 shirts
  const hoursNeeded    = quantity / SHIRTS_PER_HOUR
  const totalLaborCost = hoursNeeded * LABOR_RATE

  // 3. Subtotal before overhead
  const subtotalCost   = totalMaterialCost + totalLaborCost

  // 4. Overhead contingency: 15% on top of everything
  const overheadCost   = subtotalCost * OVERHEAD_RATE
  const totalCost      = subtotalCost + overheadCost

  const totalCostCents        = Math.round(totalCost * 100)
  const suggestedPriceCents   = applyMargin(totalCostCents)
  const unitSuggestedCents    = Math.ceil(suggestedPriceCents / quantity)

  const result: CalcResult = {
    materialCostCents: totalCostCents,
    suggestedPriceCents,
    profitCents: profitCents(totalCostCents, suggestedPriceCents),
    description: `Custom shirts ×${quantity} — blank (Fabrik.ca) + DTF (Ninja Transfers) + labor + overhead`,
  }

  return (
    <div className="flex flex-col gap-4">
      <SupplierLinks
        links={[
          { label: 'Fabrik.ca (blank shirts)', href: 'https://fabrik.ca/' },
          { label: 'Ninja Transfers (DTF)', href: 'https://ninjatransfers.com/' },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <CalcField label="Garment type">
          <select value={garment} onChange={e => setGarment(e.target.value)} className={selectCls}>
            {Object.entries(SHIRT_BASE_COSTS).map(([k, v]) => (
              <option key={k} value={k}>{k.replace(/-/g, ' ')} — ${v.toFixed(2)}</option>
            ))}
          </select>
        </CalcField>

        <CalcField label="Average size (for upcharge)">
          <select value={avgSize} onChange={e => setAvgSize(e.target.value as any)} className={selectCls}>
            {Object.entries(SHIRT_SIZE_UPCHARGE).map(([s, u]) => (
              <option key={s} value={s}>{s}{u > 0 ? ` (+$${u.toFixed(2)})` : ''}</option>
            ))}
          </select>
        </CalcField>

        <CalcField label="Quantity">
          <input type="number" min={1} value={quantity} onChange={e => setQuantity(+e.target.value || 1)} className={inputCls} />
        </CalcField>
      </div>

      <div className="rounded-lg bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Front DTF transfer (Ninja Transfers @ $0.02/sq in)</p>
        <div className="flex items-center gap-2">
          <input type="number" min={1} value={dtfWidth} onChange={e => setDtfWidth(+e.target.value || 1)} className={`${inputCls} w-20`} />
          <span className="text-sm text-gray-500">×</span>
          <input type="number" min={1} value={dtfHeight} onChange={e => setDtfHeight(+e.target.value || 1)} className={`${inputCls} w-20`} />
          <span className="text-sm text-gray-500">inches = ${dtfFrontCost.toFixed(2)}/unit</span>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={addBack} onChange={e => setAddBack(e.target.checked)} />
          Add back print
        </label>

        {addBack && (
          <div className="mt-2 flex items-center gap-2">
            <input type="number" min={1} value={dtfBackWidth} onChange={e => setDtfBackWidth(+e.target.value || 1)} className={`${inputCls} w-20`} />
            <span className="text-sm text-gray-500">×</span>
            <input type="number" min={1} value={dtfBackHeight} onChange={e => setDtfBackHeight(+e.target.value || 1)} className={`${inputCls} w-20`} />
            <span className="text-sm text-gray-500">inches = ${dtfBackCost.toFixed(2)}/unit</span>
          </div>
        )}
      </div>

      <ResultCard
        rows={[
          { label: `Blank shirts ×${quantity} (Fabrik.ca)`,                          value: `$${(shirtUnitCost * quantity).toFixed(2)}` },
          { label: `DTF transfers ×${quantity} (Ninja Transfers)`,                   value: `$${((dtfFrontCost + dtfBackCost) * quantity).toFixed(2)}` },
          { label: `Labor — ${hoursNeeded.toFixed(1)} hr @ $${LABOR_RATE}/hr (1 hr per ${SHIRTS_PER_HOUR} shirts)`, value: `$${totalLaborCost.toFixed(2)}` },
          { label: `Overhead contingency (${OVERHEAD_RATE * 100}%)`,                 value: `$${overheadCost.toFixed(2)}` },
          { label: 'Total cost',                                                      value: formatCurrency(totalCostCents), bold: true },
        ]}
        suggestedCents={suggestedPriceCents}
        profitCentsVal={result.profitCents}
        productType="shirt"
        description={result.description}
        quantity={quantity}
        unitLabel={`$${(unitSuggestedCents / 100).toFixed(2)}/shirt`}
        onApply={onApply ? () => onApply(result) : undefined}
      />
    </div>
  )
}

// ── 3D Print Calculator ─────────────────────────────────────────────────────

interface SlicerData {
  print_time_minutes: number | null
  filament_weight_g: number | null
  filament_cost_dollars: number | null
  filament_type: string | null
  model_name: string | null
  notes: string | null
}

function PrintCalculator({ onApply }: { onApply?: (r: CalcResult) => void }) {
  const [material, setMaterial] = useState('PLA (Bambu)')
  const [weightG, setWeightG] = useState(100)
  const [printTimeMin, setPrintTimeMin] = useState(60)
  const [quantity, setQuantity] = useState(1)
  const [otherCost, setOtherCost] = useState(0)
  const [scanning, setScanning] = useState(false)
  const [slicerData, setSlicerData] = useState<SlicerData | null>(null)
  const [screenshots, setScreenshots] = useState<{ name: string; url: string }[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleScreenshot(files: FileList | null) {
    if (!files?.length) return
    setScanning(true)
    // Show preview thumbnails
    const newScreenshots = Array.from(files).map(f => ({ name: f.name, url: URL.createObjectURL(f) }))
    setScreenshots(prev => [...prev, ...newScreenshots])

    // Scan the first file with Claude Vision
    const form = new FormData()
    form.append('screenshot', files[0])
    try {
      const res = await fetch('/api/agents/slicer-scan', { method: 'POST', body: form })
      const data: SlicerData = await res.json()
      if (res.ok) {
        setSlicerData(data)
        // Auto-fill fields from scan
        if (data.filament_weight_g) setWeightG(data.filament_weight_g)
        if (data.print_time_minutes) setPrintTimeMin(data.print_time_minutes)
        if (data.filament_type) {
          const match = Object.keys(FILAMENT_COSTS).find(k =>
            k.toLowerCase().includes(data.filament_type!.toLowerCase())
          )
          if (match) setMaterial(match)
        }
      }
    } catch {}
    setScanning(false)
  }

  // Electricity: ~$0.10/kWh, printer ~300W → $0.03/hr
  const electricityCost = (printTimeMin / 60) * 0.03
  const pricePerKg = FILAMENT_COSTS[material] ?? 25
  const filamentCost = (weightG / 1000) * pricePerKg
  const totalMaterialCost = (filamentCost + electricityCost + otherCost) * quantity
  const totalMaterialCents = Math.round(totalMaterialCost * 100)
  const suggestedPriceCents = applyMargin(totalMaterialCents)

  const result: CalcResult = {
    materialCostCents: totalMaterialCents,
    suggestedPriceCents,
    profitCents: profitCents(totalMaterialCents, suggestedPriceCents),
    description: `3D Print ×${quantity} — ${material} ~${weightG}g each, ~${Math.round(printTimeMin / 60 * 10) / 10}h print`,
  }

  return (
    <div className="flex flex-col gap-4">
      <SupplierLinks
        links={[{ label: 'Bambu Lab Filament Store', href: 'https://ca.store.bambulab.com/collections/bambu-lab-3d-printer-filament' }]}
      />

      {/* Slicer screenshot upload */}
      <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-indigo-700">Slicer screenshots (optional — auto-fills fields)</p>
          {scanning && <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />}
          {slicerData && !scanning && <CheckCircle className="h-4 w-4 text-green-500" />}
        </div>

        {/* Screenshot thumbnails */}
        {screenshots.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {screenshots.map((s, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.url} alt={s.name} className="h-16 w-24 rounded-lg border border-indigo-200 object-cover" />
                <p className="mt-0.5 max-w-[96px] truncate text-[10px] text-indigo-500">{s.name}</p>
              </div>
            ))}
          </div>
        )}

        {slicerData && (
          <div className="mb-3 rounded-lg bg-white border border-indigo-100 px-3 py-2 text-xs text-indigo-800">
            <p className="font-semibold mb-1">Extracted from screenshot:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
              {slicerData.print_time_minutes && <span>Print time: <strong>{Math.floor(slicerData.print_time_minutes / 60)}h {slicerData.print_time_minutes % 60}m</strong></span>}
              {slicerData.filament_weight_g && <span>Weight: <strong>{slicerData.filament_weight_g}g</strong></span>}
              {slicerData.filament_type && <span>Material: <strong>{slicerData.filament_type}</strong></span>}
              {slicerData.filament_cost_dollars && <span>Slicer cost est.: <strong>${slicerData.filament_cost_dollars.toFixed(2)}</strong></span>}
              {slicerData.model_name && <span className="col-span-2">Model: <strong>{slicerData.model_name}</strong></span>}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={scanning}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-white py-2 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50 disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {scanning ? 'Scanning…' : screenshots.length > 0 ? 'Add more screenshots' : 'Upload slicer screenshot'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleScreenshot(e.target.files)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <CalcField label="Filament type">
          <select value={material} onChange={e => setMaterial(e.target.value)} className={selectCls}>
            {Object.entries(FILAMENT_COSTS).map(([m, p]) => (
              <option key={m} value={m}>{m} — ${p}/kg</option>
            ))}
          </select>
        </CalcField>
        <CalcField label="Weight per unit (grams)">
          <input type="number" min={1} value={weightG} onChange={e => setWeightG(+e.target.value || 1)} className={inputCls} />
        </CalcField>
        <CalcField label="Print time per unit (minutes)">
          <input type="number" min={1} value={printTimeMin} onChange={e => setPrintTimeMin(+e.target.value || 1)} className={inputCls} />
        </CalcField>
        <CalcField label="Quantity">
          <input type="number" min={1} value={quantity} onChange={e => setQuantity(+e.target.value || 1)} className={inputCls} />
        </CalcField>
        <CalcField label="Other costs per unit ($ — post-processing, supports, etc.)">
          <input type="number" min={0} step={0.50} value={otherCost} onChange={e => setOtherCost(+e.target.value || 0)} className={inputCls} />
        </CalcField>
      </div>

      <ResultCard
        rows={[
          { label: `Filament (${weightG}g × ${quantity} @ $${pricePerKg}/kg)`, value: `$${(filamentCost * quantity).toFixed(2)}` },
          { label: `Electricity (~${Math.round(printTimeMin / 60 * 10) / 10}h × $0.03/hr × ${quantity})`, value: `$${(electricityCost * quantity).toFixed(2)}` },
          { label: `Other costs (×${quantity})`, value: `$${(otherCost * quantity).toFixed(2)}` },
          { label: 'Total cost', value: formatCurrency(totalMaterialCents), bold: true },
        ]}
        suggestedCents={suggestedPriceCents}
        profitCentsVal={result.profitCents}
        productType="3d_print"
        description={result.description}
        quantity={quantity}
        onApply={onApply ? () => onApply(result) : undefined}
      />
    </div>
  )
}

// ── Custom / DIY / Lighting Calculator ─────────────────────────────────────

function CustomCalculator({ onApply }: { onApply?: (r: CalcResult) => void }) {
  const [materialCost, setMaterialCost] = useState('')
  const [description, setDescription] = useState('')

  const costCents = Math.round((parseFloat(materialCost) || 0) * 100)
  const suggestedPriceCents = applyMargin(costCents)

  const result: CalcResult = {
    materialCostCents: costCents,
    suggestedPriceCents,
    profitCents: profitCents(costCents, suggestedPriceCents),
    description: description || 'Custom project',
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <CalcField label="Total material cost ($)">
          <input
            type="number" min={0} step={0.50}
            placeholder="0.00"
            value={materialCost}
            onChange={e => setMaterialCost(e.target.value)}
            className={inputCls}
          />
        </CalcField>
        <CalcField label="Description (for quote line item)">
          <input
            type="text"
            placeholder="Custom project — materials"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className={inputCls}
          />
        </CalcField>
      </div>

      {costCents > 0 && (
        <ResultCard
          rows={[
            { label: 'Material cost entered', value: formatCurrency(costCents), bold: true },
          ]}
          suggestedCents={suggestedPriceCents}
          profitCentsVal={result.profitCents}
          productType="diy"
          description={description || 'Custom project'}
          quantity={1}
          onApply={onApply ? () => onApply(result) : undefined}
        />
      )}
    </div>
  )
}

// ── Shared sub-components ───────────────────────────────────────────────────

function SupplierLinks({ links }: { links: { label: string; href: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {links.map(({ label, href }) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-indigo-700 shadow-sm hover:bg-indigo-50 border border-indigo-200"
        >
          {label} <ExternalLink className="h-3 w-3" />
        </a>
      ))}
    </div>
  )
}

function CalcField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  )
}

interface ResultRow { label: string; value: string; bold?: boolean }

const SPECTRUM_DISCOUNT = 0.10   // 10% below/above recommended

const tiers = [
  {
    key: 'friends',
    label: 'Friends & Family',
    icon: '💛',
    multiplier: 1 - SPECTRUM_DISCOUNT,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    badge: 'bg-amber-100 text-amber-700',
    note: '−10%',
  },
  {
    key: 'recommended',
    label: 'Recommended',
    icon: '✅',
    multiplier: 1,
    bg: 'bg-indigo-50',
    border: 'border-indigo-300',
    text: 'text-indigo-800',
    badge: 'bg-indigo-100 text-indigo-700',
    note: 'base',
  },
  {
    key: 'corporate',
    label: 'Corporate',
    icon: '🏢',
    multiplier: 1 + SPECTRUM_DISCOUNT,
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
    badge: 'bg-emerald-100 text-emerald-700',
    note: '+10%',
  },
] as const

interface MarketData {
  market_low_cents: number
  market_mid_cents: number
  market_high_cents: number
  assessment: 'underpriced' | 'competitive' | 'premium' | 'unknown'
  assessment_note: string
  reasoning: string
  tips: string[]
}

function ResultCard({
  rows, suggestedCents, profitCentsVal, productType, description, quantity, unitLabel, onApply,
}: {
  rows: ResultRow[]
  suggestedCents: number
  profitCentsVal: number
  productType: string
  description: string
  quantity: number
  unitLabel?: string
  onApply?: () => void
}) {
  const [market, setMarket] = useState<MarketData | null>(null)
  const [loadingMarket, setLoadingMarket] = useState(false)

  async function fetchMarket() {
    setLoadingMarket(true)
    try {
      const res = await fetch('/api/agents/market-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_type: productType, description, quantity, our_price_cents: suggestedCents }),
      })
      if (res.ok) setMarket(await res.json())
    } catch {}
    setLoadingMarket(false)
  }

  const assessmentStyle: Record<string, { color: string; icon: React.ReactNode }> = {
    underpriced:  { color: 'text-amber-700 bg-amber-50 border-amber-200', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    competitive:  { color: 'text-green-700 bg-green-50 border-green-200',  icon: <CheckCircle className="h-3.5 w-3.5" /> },
    premium:      { color: 'text-indigo-700 bg-indigo-50 border-indigo-200', icon: <TrendingUp className="h-3.5 w-3.5" /> },
    unknown:      { color: 'text-gray-600 bg-gray-50 border-gray-200',    icon: null },
  }
  const aStyle = assessmentStyle[market?.assessment ?? 'unknown']

  return (
    <div className="rounded-lg border border-indigo-200 bg-white p-4">
      {/* Cost breakdown */}
      <div className="mb-3 flex flex-col gap-1 text-sm">
        {rows.map(r => (
          <div key={r.label} className={`flex justify-between ${r.bold ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
            <span>{r.label}</span>
            <span>{r.value}</span>
          </div>
        ))}
      </div>

      {/* Price spectrum */}
      <div className="border-t border-dashed border-indigo-200 pt-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Price spectrum</p>
        <div className="grid grid-cols-3 gap-2">
          {tiers.map(tier => {
            const priceCents = Math.round(suggestedCents * tier.multiplier)
            return (
              <div
                key={tier.key}
                className={`flex flex-col items-center rounded-lg border ${tier.border} ${tier.bg} p-2.5 text-center`}
              >
                <span className="mb-1 text-base">{tier.icon}</span>
                <p className={`text-[11px] font-semibold leading-tight ${tier.text}`}>{tier.label}</p>
                <p className={`mt-1 text-sm font-bold ${tier.text}`}>{formatCurrency(priceCents)}</p>
                <span className={`mt-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${tier.badge}`}>
                  {tier.note}
                </span>
              </div>
            )
          })}
        </div>

        <p className="mt-2 text-center text-xs text-green-700">
          Profit at recommended: {formatCurrency(profitCentsVal)} ({(MARGIN * 100).toFixed(0)}% margin)
        </p>
        {unitLabel && (
          <p className="mt-0.5 text-center text-xs text-gray-400">≈ {unitLabel} at recommended price</p>
        )}
      </div>

      {/* Market pricing panel */}
      <div className="mt-4 border-t border-dashed border-indigo-200 pt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Canadian market rates</p>
          <button
            type="button"
            onClick={fetchMarket}
            disabled={loadingMarket}
            className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 border border-indigo-200 transition-colors"
          >
            {loadingMarket
              ? <><Loader2 className="h-3 w-3 animate-spin" /> Analyzing…</>
              : <><Sparkles className="h-3 w-3" /> {market ? 'Refresh' : 'Get market rates'}</>
            }
          </button>
        </div>

        {market && (
          <div className="flex flex-col gap-3">
            {/* Assessment badge */}
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${aStyle.color}`}>
              {aStyle.icon}
              <span className="capitalize font-semibold">{market.assessment}:</span>
              <span className="font-normal">{market.assessment_note}</span>
            </div>

            {/* Market range bar */}
            <div>
              <p className="mb-1.5 text-[11px] text-gray-500">Market range (CAD)</p>
              <div className="relative h-7 rounded-full bg-gray-100">
                {/* Market range fill */}
                {(() => {
                  const min = market.market_low_cents
                  const max = market.market_high_cents
                  const range = max - min || 1
                  const ourPct = Math.min(100, Math.max(0, ((suggestedCents - min) / range) * 100))
                  const lowPct = 0
                  const highPct = 100
                  return (
                    <>
                      <div className="absolute inset-y-0 left-0 right-0 rounded-full overflow-hidden">
                        <div className="h-full w-full bg-gradient-to-r from-amber-100 via-green-100 to-indigo-100 rounded-full" />
                      </div>
                      {/* Our price marker */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-1.5 rounded-full bg-indigo-600 shadow"
                        style={{ left: `${ourPct}%` }}
                        title={`Our price: ${formatCurrency(suggestedCents)}`}
                      />
                      {/* Labels */}
                      <div className="absolute inset-y-0 left-2 flex items-center text-[10px] text-gray-500">
                        {formatCurrency(min)}
                      </div>
                      <div className="absolute inset-y-0 right-2 flex items-center text-[10px] text-gray-500">
                        {formatCurrency(max)}
                      </div>
                    </>
                  )
                })()}
              </div>
              <div className="mt-1 text-center text-[10px] text-gray-400">
                Market mid: {formatCurrency(market.market_mid_cents)} · Our price: {formatCurrency(suggestedCents)}
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">{market.reasoning}</p>

            {market.tips?.length > 0 && (
              <ul className="flex flex-col gap-1">
                {market.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-500">
                    <span className="mt-0.5 text-indigo-400">→</span>{tip}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {onApply && suggestedCents > 0 && (
        <Button size="sm" className="mt-3 w-full" onClick={onApply}>
          Apply recommended price to quote
        </Button>
      )}
    </div>
  )
}

const selectCls = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const inputCls  = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
