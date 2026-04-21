// Shared pricing logic used by both the frontend PricingCalculator
// and the backend quote-draft agent.

import type { ColorGroup } from '@/types'

export const MARGIN = 0.35
export const MULTIPLIER = 1 / (1 - MARGIN)   // ~1.5385

export const LABOR_RATE = 50        // $50/hr
export const SHIRTS_PER_HOUR = 10
export const OVERHEAD_RATE = 0.15   // 15% contingency

export const SHIRT_STYLE_COSTS: Record<string, number> = {
  tshirt:     3.10,
  longsleeve: 6.50,
  crewneck:   14.00,
  hoodie:     18.00,
  ziphoodie:  18.00,
}

export const SHIRT_SIZE_UPCHARGE: Record<string, number> = {
  XS: 0, S: 0, M: 0, L: 0, XL: 0,
  '2XL': 1.00, '3XL': 2.00,
}

export const FILAMENT_COSTS_PER_KG: Record<string, number> = {
  'PLA Basic': 29,
  'PLA Matte': 29,
  'PLA Silk':  32,
  'PETG':      22,
  'TPU':       32,
}

// ── Live prices from price_configs table ─────────────────────────────────────

export interface LivePrices {
  shirtStyles: Record<string, number>   // style → cost in dollars
  dtfPerSqIn: number                    // dollars per sq inch
  filamentPerKg: Record<string, number> // material name → cost per kg in dollars
}

const FILAMENT_ID_TO_NAME: Record<string, string> = {
  filament_pla_basic: 'PLA Basic',
  filament_pla_matte: 'PLA Matte',
  filament_pla_silk:  'PLA Silk',
  filament_petg:      'PETG',
  filament_tpu:       'TPU',
}

export function buildLivePrices(configs: any[]): LivePrices {
  const prices: LivePrices = {
    shirtStyles:   { ...SHIRT_STYLE_COSTS },
    dtfPerSqIn:    0.02,
    filamentPerKg: { ...FILAMENT_COSTS_PER_KG },
  }
  for (const c of configs) {
    if (c.id.startsWith('shirt_')) {
      prices.shirtStyles[c.id.replace('shirt_', '')] = c.value_cents / 100
    } else if (c.id === 'dtf_per_sqin') {
      prices.dtfPerSqIn = c.value_cents / 100
    } else if (FILAMENT_ID_TO_NAME[c.id]) {
      prices.filamentPerKg[FILAMENT_ID_TO_NAME[c.id]] = c.value_cents / 100
    }
  }
  return prices
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function applyMargin(costCents: number): number {
  return Math.ceil(costCents * MULTIPLIER)
}

export interface PricingResult {
  costCents: number
  priceCents: number
  description: string
  notes: string
}

// ── Shirt order ───────────────────────────────────────────────────────────────

export function normalizeShirtConfig(config: any): { color_groups: ColorGroup[] } {
  if (Array.isArray(config.color_groups)) return { color_groups: config.color_groups }
  return {
    color_groups: [{
      color: config.shirt_color ?? 'Unknown',
      sizes: config.sizes ?? [],
    }],
  }
}

const STYLE_NAMES: Record<string, string> = {
  tshirt: 'T-Shirt', longsleeve: 'Long Sleeve', crewneck: 'Crewneck',
  hoodie: 'Hoodie', ziphoodie: 'Zip Hoodie',
}

export function calcShirtOrder(config: any, prices?: LivePrices): PricingResult {
  const styleCosts = prices?.shirtStyles ?? SHIRT_STYLE_COSTS
  const dtfRate    = prices?.dtfPerSqIn  ?? 0.02

  const dtfFront = (config.dtf_front_width ?? 0) * (config.dtf_front_height ?? 0) * dtfRate
  const dtfBack  = (config.dtf_back_width  ?? 0) * (config.dtf_back_height  ?? 0) * dtfRate
  const hasDtf   = dtfFront > 0 || dtfBack > 0
  const dtfDesc  = hasDtf
    ? ` + DTF (${dtfFront > 0 ? `front ${config.dtf_front_width}"×${config.dtf_front_height}"` : ''}${dtfBack > 0 ? ` back ${config.dtf_back_width}"×${config.dtf_back_height}"` : ''})`
    : ' + DTF transfer (size not specified)'
  const notes = !hasDtf ? 'DTF print dimensions were not provided — update DTF costs before sending.' : ''

  // Multi-style format
  if (Array.isArray(config.style_groups) && config.style_groups.length > 0) {
    let totalCostCents = 0
    let totalQty = 0
    const styleDescParts: string[] = []

    for (const sg of config.style_groups) {
      const style = sg.shirt_style ?? 'tshirt'
      const colorGroups: ColorGroup[] = sg.color_groups ?? []
      const allSizes = colorGroups.flatMap((g: any) => g.sizes)
      const qty = allSizes.reduce((s: number, sz: any) => s + (sz.quantity ?? 0), 0)
      if (qty === 0) continue

      const baseUnitCost = styleCosts[style] ?? 3.10
      const totalUpcharge = allSizes.reduce((sum: number, sz: any) => sum + (SHIRT_SIZE_UPCHARGE[sz.size] ?? 0) * sz.quantity, 0)
      const avgUpcharge = totalUpcharge / qty
      const unitMaterial = baseUnitCost + avgUpcharge + dtfFront + dtfBack
      const subtotal = unitMaterial * qty + (qty / SHIRTS_PER_HOUR) * LABOR_RATE
      totalCostCents += Math.round((subtotal + subtotal * OVERHEAD_RATE) * 100)
      totalQty += qty

      const colorSummary = colorGroups.length === 1
        ? colorGroups[0].color
        : colorGroups.map((g: any) => {
            const gQty = g.sizes.reduce((s: number, sz: any) => s + sz.quantity, 0)
            return `${g.color} ×${gQty}`
          }).join(', ')
      styleDescParts.push(`${STYLE_NAMES[style] ?? style} ×${qty} (${colorSummary})`)
    }

    if (totalQty === 0) {
      return { costCents: 0, priceCents: 0, description: 'Custom apparel', notes: 'No quantities specified — please review.' }
    }
    return {
      costCents: totalCostCents,
      priceCents: applyMargin(totalCostCents),
      description: `Custom apparel ×${totalQty}: ${styleDescParts.join(' + ')} — blank (Fabrik.ca)${dtfDesc} + labor + overhead`,
      notes,
    }
  }

  // Single-style format (legacy)
  const { color_groups } = normalizeShirtConfig(config)
  const allSizes = color_groups.flatMap(g => g.sizes)
  const qty = allSizes.reduce((s, sz) => s + (sz.quantity ?? 0), 0)

  if (qty === 0) {
    return { costCents: 0, priceCents: 0, description: 'Custom shirts', notes: 'No quantities specified — please review.' }
  }

  const style = config.shirt_style ?? 'tshirt'
  const baseUnitCost = styleCosts[style] ?? 3.10
  const totalUpcharge = allSizes.reduce((sum, sz) => sum + (SHIRT_SIZE_UPCHARGE[sz.size] ?? 0) * sz.quantity, 0)
  const avgUpcharge = totalUpcharge / qty
  const unitMaterial = baseUnitCost + avgUpcharge + dtfFront + dtfBack
  const subtotal = unitMaterial * qty + (qty / SHIRTS_PER_HOUR) * LABOR_RATE
  const costCents = Math.round((subtotal + subtotal * OVERHEAD_RATE) * 100)

  const colorSummary = color_groups.length === 1
    ? color_groups[0].color
    : color_groups.map(g => {
        const groupQty = g.sizes.reduce((s, sz) => s + sz.quantity, 0)
        return `${g.color} ×${groupQty}`
      }).join(', ')

  return {
    costCents,
    priceCents: applyMargin(costCents),
    description: `Custom ${STYLE_NAMES[style] ?? style} ×${qty} (${colorSummary}) — blank (Fabrik.ca)${dtfDesc} + labor + overhead`,
    notes,
  }
}

// ── 3D print order ────────────────────────────────────────────────────────────

export function calcPrintOrder(config: any, prices?: LivePrices): PricingResult {
  const filamentCosts = prices?.filamentPerKg ?? FILAMENT_COSTS_PER_KG
  const qty           = config.quantity ?? 1
  const material      = config.material ?? 'PLA Basic'
  const perKg         = filamentCosts[material] ?? 29

  const estimatedWeightG = 100
  const filamentCost = (estimatedWeightG / 1000) * perKg * qty
  const costCents    = Math.round(filamentCost * 100)

  return {
    costCents,
    priceCents: applyMargin(costCents),
    description: `3D Print ×${qty} — ${material} ~${estimatedWeightG}g/unit`,
    notes: 'Weight estimated at 100g/unit. Slice the STL to get the actual weight and update the quote.',
  }
}

// ── DIY / Lighting ────────────────────────────────────────────────────────────

export function calcConsultationOrder(config: any): PricingResult {
  return {
    costCents: 0,
    priceCents: 0,
    description: config.description ? config.description.slice(0, 100) : 'Custom project',
    notes: 'Consultation order — material cost and price must be set manually after reviewing the request.',
  }
}
