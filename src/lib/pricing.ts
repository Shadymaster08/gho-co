// Shared pricing logic used by both the frontend PricingCalculator
// and the backend quote-draft agent.

import type { ColorGroup } from '@/types'

export const MARGIN = 0.35
export const MULTIPLIER = 1 / (1 - MARGIN)   // ~1.5385

export const LABOR_RATE = 50        // $50/hr
export const SHIRTS_PER_HOUR = 10
export const OVERHEAD_RATE = 0.15   // 15% contingency

export const SHIRT_STYLE_COSTS: Record<string, number> = {
  tshirt:    3.10,
  longsleeve: 6.50,
  crewneck:  14.00,
  hoodie:    18.00,
  ziphoodie: 18.00,
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

export function applyMargin(costCents: number): number {
  return Math.ceil(costCents * MULTIPLIER)
}

export interface PricingResult {
  costCents: number
  priceCents: number
  description: string
  notes: string
}

// ── Shirt order ──────────────────────────────────────────────────────────────

// Handles both the new color_groups format and legacy shirt_color + sizes format.
export function normalizeShirtConfig(config: any): { color_groups: ColorGroup[] } {
  if (Array.isArray(config.color_groups)) return { color_groups: config.color_groups }
  return {
    color_groups: [{
      color: config.shirt_color ?? 'Unknown',
      sizes: config.sizes ?? [],
    }],
  }
}

export function calcShirtOrder(config: any): PricingResult {
  const { color_groups } = normalizeShirtConfig(config)
  const allSizes = color_groups.flatMap(g => g.sizes)
  const qty = allSizes.reduce((s, sz) => s + (sz.quantity ?? 0), 0)

  if (qty === 0) {
    return { costCents: 0, priceCents: 0, description: 'Custom shirts', notes: 'No quantities specified — please review.' }
  }

  const style = config.shirt_style ?? 'tshirt'
  const baseUnitCost = SHIRT_STYLE_COSTS[style] ?? 3.10

  const totalUpcharge = allSizes.reduce((sum, sz) => sum + (SHIRT_SIZE_UPCHARGE[sz.size] ?? 0) * sz.quantity, 0)
  const avgUpcharge = totalUpcharge / qty

  const dtfFront = (config.dtf_front_width ?? 0) * (config.dtf_front_height ?? 0) * 0.02
  const dtfBack  = (config.dtf_back_width  ?? 0) * (config.dtf_back_height  ?? 0)  * 0.02

  const unitMaterial   = baseUnitCost + avgUpcharge + dtfFront + dtfBack
  const totalMaterial  = unitMaterial * qty
  const labor          = (qty / SHIRTS_PER_HOUR) * LABOR_RATE
  const subtotal       = totalMaterial + labor
  const overhead       = subtotal * OVERHEAD_RATE
  const totalCost      = subtotal + overhead
  const costCents      = Math.round(totalCost * 100)
  const priceCents     = applyMargin(costCents)

  const styleName = style.charAt(0).toUpperCase() + style.slice(1)
  const hasDtf = dtfFront > 0 || dtfBack > 0
  const dtfDesc = hasDtf
    ? ` + DTF (${dtfFront > 0 ? `front ${config.dtf_front_width}"×${config.dtf_front_height}"` : ''}${dtfBack > 0 ? ` back ${config.dtf_back_width}"×${config.dtf_back_height}"` : ''})`
    : ' + DTF transfer (size not specified)'

  const colorSummary = color_groups.length === 1
    ? color_groups[0].color
    : color_groups.map(g => {
        const groupQty = g.sizes.reduce((s, sz) => s + sz.quantity, 0)
        return `${g.color} ×${groupQty}`
      }).join(', ')

  const notes = !hasDtf
    ? 'DTF print dimensions were not provided — update DTF costs before sending.'
    : ''

  return {
    costCents,
    priceCents,
    description: `Custom ${styleName} ×${qty} (${colorSummary}) — blank (Fabrik.ca)${dtfDesc} + labor + overhead`,
    notes,
  }
}

// ── 3D print order ───────────────────────────────────────────────────────────

export function calcPrintOrder(config: any): PricingResult {
  const qty      = config.quantity ?? 1
  const material = config.material ?? 'PLA Basic'
  const perKg    = FILAMENT_COSTS_PER_KG[material] ?? 29

  // Weight is unknown without slicing the STL — use 100g as a safe default
  const estimatedWeightG = 100
  const filamentCost = (estimatedWeightG / 1000) * perKg * qty
  const costCents = Math.round(filamentCost * 100)
  const priceCents = applyMargin(costCents)

  return {
    costCents,
    priceCents,
    description: `3D Print ×${qty} — ${material} ~${estimatedWeightG}g/unit`,
    notes: 'Weight estimated at 100g/unit. Slice the STL to get the actual weight and update the quote.',
  }
}

// ── DIY / Lighting ───────────────────────────────────────────────────────────

export function calcConsultationOrder(config: any): PricingResult {
  return {
    costCents: 0,
    priceCents: 0,
    description: config.description ? config.description.slice(0, 100) : 'Custom project',
    notes: 'Consultation order — material cost and price must be set manually after reviewing the request.',
  }
}
