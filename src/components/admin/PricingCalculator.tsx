'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { Calculator, ExternalLink } from 'lucide-react'
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
        unitLabel={`$${(unitSuggestedCents / 100).toFixed(2)}/shirt`}
        onApply={onApply ? () => onApply(result) : undefined}
      />
    </div>
  )
}

// ── 3D Print Calculator ─────────────────────────────────────────────────────

function PrintCalculator({ onApply }: { onApply?: (r: CalcResult) => void }) {
  const [material, setMaterial] = useState('PLA (Bambu)')
  const [weightG, setWeightG] = useState(100)
  const [quantity, setQuantity] = useState(1)
  const [otherCost, setOtherCost] = useState(0)

  const pricePerKg = FILAMENT_COSTS[material] ?? 25
  const filamentCost = (weightG / 1000) * pricePerKg
  const totalMaterialCost = (filamentCost + otherCost) * quantity
  const totalMaterialCents = Math.round(totalMaterialCost * 100)
  const suggestedPriceCents = applyMargin(totalMaterialCents)

  const result: CalcResult = {
    materialCostCents: totalMaterialCents,
    suggestedPriceCents,
    profitCents: profitCents(totalMaterialCents, suggestedPriceCents),
    description: `3D Print ×${quantity} — ${material} ${weightG}g each`,
  }

  return (
    <div className="flex flex-col gap-4">
      <SupplierLinks
        links={[{ label: 'Bambu Lab Filament Store', href: 'https://ca.store.bambulab.com/collections/bambu-lab-3d-printer-filament' }]}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <CalcField label="Filament type">
          <select value={material} onChange={e => setMaterial(e.target.value)} className={selectCls}>
            {Object.entries(FILAMENT_COSTS).map(([m, p]) => (
              <option key={m} value={m}>{m} — ${p}/kg</option>
            ))}
          </select>
        </CalcField>
        <CalcField label="Estimated weight per unit (grams)">
          <input type="number" min={1} value={weightG} onChange={e => setWeightG(+e.target.value || 1)} className={inputCls} />
        </CalcField>
        <CalcField label="Quantity">
          <input type="number" min={1} value={quantity} onChange={e => setQuantity(+e.target.value || 1)} className={inputCls} />
        </CalcField>
        <CalcField label="Other costs per unit ($ — time, electricity, post-processing)">
          <input type="number" min={0} step={0.50} value={otherCost} onChange={e => setOtherCost(+e.target.value || 0)} className={inputCls} />
        </CalcField>
      </div>

      <ResultCard
        rows={[
          { label: `Filament (${weightG}g × ${quantity} @ $${pricePerKg}/kg)`, value: `$${(filamentCost * quantity).toFixed(2)}` },
          { label: `Other costs (×${quantity})`, value: `$${(otherCost * quantity).toFixed(2)}` },
          { label: 'Total material cost', value: formatCurrency(totalMaterialCents), bold: true },
        ]}
        suggestedCents={suggestedPriceCents}
        profitCentsVal={result.profitCents}
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

function ResultCard({
  rows, suggestedCents, profitCentsVal, unitLabel, onApply,
}: {
  rows: ResultRow[]
  suggestedCents: number
  profitCentsVal: number
  unitLabel?: string
  onApply?: () => void
}) {
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
                {unitLabel && (
                  <p className="mt-0.5 text-[10px] text-gray-400">
                    ≈ {formatCurrency(Math.round(priceCents / (suggestedCents / (suggestedCents / suggestedCents))))}
                  </p>
                )}
                <span className={`mt-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${tier.badge}`}>
                  {tier.note}
                </span>
              </div>
            )
          })}
        </div>

        {/* Profit at recommended */}
        <p className="mt-2 text-center text-xs text-green-700">
          Profit at recommended: {formatCurrency(profitCentsVal)} ({(MARGIN * 100).toFixed(0)}% margin)
        </p>
        {unitLabel && (
          <p className="mt-0.5 text-center text-xs text-gray-400">≈ {unitLabel} at recommended price</p>
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
