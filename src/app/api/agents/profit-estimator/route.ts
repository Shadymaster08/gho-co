import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  calcShirtOrder,
  calcPrintOrder,
  calcConsultationOrder,
  MARGIN,
  SHIRT_STYLE_COSTS,
  FILAMENT_COSTS_PER_KG,
} from '@/lib/pricing'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient()

  // Fetch all accepted/sent quotes with their order config
  const { data: quotes } = await service
    .from('quotes')
    .select('id, quote_number, total_cents, material_cost_cents, accepted_at, created_at, status, order_id, orders(product_type, configuration)')
    .in('status', ['accepted', 'sent'])
    .order('created_at', { ascending: true })

  // Fetch current price configs
  const { data: priceConfigs } = await service
    .from('price_configs')
    .select('id, value_cents')

  // Build a map of current prices
  const priceMap: Record<string, number> = {}
  for (const pc of priceConfigs ?? []) {
    priceMap[pc.id] = pc.value_cents
  }

  // Rebuild SHIRT_STYLE_COSTS and FILAMENT_COSTS from live price_configs
  const liveShirtCosts: Record<string, number> = {
    tshirt:     (priceMap['shirt_tshirt']     ?? SHIRT_STYLE_COSTS.tshirt * 100)     / 100,
    longsleeve: (priceMap['shirt_longsleeve'] ?? SHIRT_STYLE_COSTS.longsleeve * 100) / 100,
    crewneck:   (priceMap['shirt_crewneck']   ?? SHIRT_STYLE_COSTS.crewneck * 100)   / 100,
    hoodie:     (priceMap['shirt_hoodie']     ?? SHIRT_STYLE_COSTS.hoodie * 100)     / 100,
    ziphoodie:  (priceMap['shirt_ziphoodie']  ?? SHIRT_STYLE_COSTS.ziphoodie * 100)  / 100,
  }
  const liveFilamentCosts: Record<string, number> = {
    'PLA Basic': (priceMap['filament_pla_basic'] ?? FILAMENT_COSTS_PER_KG['PLA Basic'] * 100) / 100,
    'PLA Matte': (priceMap['filament_pla_matte'] ?? FILAMENT_COSTS_PER_KG['PLA Matte'] * 100) / 100,
    'PLA Silk':  (priceMap['filament_pla_silk']  ?? FILAMENT_COSTS_PER_KG['PLA Silk'] * 100)  / 100,
    'PETG':      (priceMap['filament_petg']       ?? FILAMENT_COSTS_PER_KG['PETG'] * 100)      / 100,
    'TPU':       (priceMap['filament_tpu']        ?? FILAMENT_COSTS_PER_KG['TPU'] * 100)       / 100,
  }
  const liveDtfPerSqIn = (priceMap['dtf_per_sqin'] ?? 2) / 100

  const results = (quotes ?? []).map(quote => {
    const order = (quote as any).orders
    const productType: string = order?.product_type ?? 'unknown'
    const config = order?.configuration ?? {}

    // Re-calculate cost with live prices
    let liveCalc: { costCents: number; priceCents: number }
    if (productType === 'shirt') {
      const patchedConfig = { ...config, _liveShirtCosts: liveShirtCosts, _liveDtfPerSqIn: liveDtfPerSqIn }
      liveCalc = calcShirtOrderWithLivePrices(patchedConfig, liveShirtCosts, liveDtfPerSqIn)
    } else if (productType === '3d_print') {
      liveCalc = calcPrintOrderWithLivePrices(config, liveFilamentCosts)
    } else {
      liveCalc = { costCents: 0, priceCents: 0 }
    }

    const quotedRevenue = quote.total_cents ?? 0
    const quotedCost = quote.material_cost_cents ?? 0
    const liveCost = liveCalc.costCents

    const quotedMarginPct = quotedRevenue > 0
      ? Math.round(((quotedRevenue - quotedCost) / quotedRevenue) * 100)
      : 0

    const liveMarginPct = quotedRevenue > 0 && liveCost > 0
      ? Math.round(((quotedRevenue - liveCost) / quotedRevenue) * 100)
      : quotedMarginPct

    const marginSlippage = quotedMarginPct - liveMarginPct
    const date = quote.accepted_at ?? quote.created_at

    return {
      id: quote.id,
      quote_number: quote.quote_number,
      product_type: productType,
      date,
      month: date ? date.slice(0, 7) : 'unknown',
      quoted_revenue_cents: quotedRevenue,
      quoted_cost_cents: quotedCost,
      live_cost_cents: liveCost,
      quoted_margin_pct: quotedMarginPct,
      live_margin_pct: liveMarginPct,
      margin_slippage_pct: marginSlippage,
      at_risk: marginSlippage >= 5,
    }
  })

  // Aggregate by month
  const monthlyMap: Record<string, { revenue: number; cost: number; count: number; profit: number }> = {}
  for (const r of results) {
    const m = r.month
    if (!monthlyMap[m]) monthlyMap[m] = { revenue: 0, cost: 0, count: 0, profit: 0 }
    monthlyMap[m].revenue += r.quoted_revenue_cents
    monthlyMap[m].cost += r.quoted_cost_cents
    monthlyMap[m].profit += r.quoted_revenue_cents - r.quoted_cost_cents
    monthlyMap[m].count++
  }

  const monthly = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, d]) => ({
      month,
      label: new Date(month + '-01').toLocaleString('en-US', { month: 'short', year: '2-digit' }),
      revenue_cents: d.revenue,
      cost_cents: d.cost,
      profit_cents: d.profit,
      margin_pct: d.revenue > 0 ? Math.round((d.profit / d.revenue) * 100) : 0,
      count: d.count,
    }))

  const totalRevenue = results.reduce((s, r) => s + r.quoted_revenue_cents, 0)
  const totalCost = results.reduce((s, r) => s + r.quoted_cost_cents, 0)
  const totalProfit = totalRevenue - totalCost
  const avgMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0
  const atRiskCount = results.filter(r => r.at_risk).length
  const targetMargin = Math.round(MARGIN * 100)

  return NextResponse.json({
    quotes: results.slice(-20).reverse(),
    monthly,
    summary: {
      total_revenue_cents: totalRevenue,
      total_cost_cents: totalCost,
      total_profit_cents: totalProfit,
      avg_margin_pct: avgMargin,
      target_margin_pct: targetMargin,
      at_risk_count: atRiskCount,
      total_quotes: results.length,
    },
  })
}

// Re-runs shirt pricing with live costs instead of hardcoded constants
function calcShirtOrderWithLivePrices(
  config: any,
  liveShirtCosts: Record<string, number>,
  liveDtfPerSqIn: number,
): { costCents: number; priceCents: number } {
  const color_groups = config.color_groups ?? (config.shirt_color ? [{ color: config.shirt_color, sizes: config.sizes ?? [] }] : [])
  const allSizes = color_groups.flatMap((g: any) => g.sizes ?? [])
  const qty = allSizes.reduce((s: number, sz: any) => s + (sz.quantity ?? 0), 0)
  if (qty === 0) return { costCents: 0, priceCents: 0 }

  const style = config.shirt_style ?? 'tshirt'
  const baseUnitCost = liveShirtCosts[style] ?? 3.10
  const dtfFront = (config.dtf_front_width ?? 0) * (config.dtf_front_height ?? 0) * liveDtfPerSqIn
  const dtfBack  = (config.dtf_back_width  ?? 0) * (config.dtf_back_height  ?? 0) * liveDtfPerSqIn
  const unitMaterial  = baseUnitCost + dtfFront + dtfBack
  const totalMaterial = unitMaterial * qty
  const labor     = (qty / 10) * 50
  const subtotal  = totalMaterial + labor
  const overhead  = subtotal * 0.15
  const costCents = Math.round((subtotal + overhead) * 100)
  const priceCents = Math.ceil(costCents / (1 - 0.35))
  return { costCents, priceCents }
}

function calcPrintOrderWithLivePrices(
  config: any,
  liveFilamentCosts: Record<string, number>,
): { costCents: number; priceCents: number } {
  const qty      = config.quantity ?? 1
  const material = config.material ?? 'PLA Basic'
  const perKg    = liveFilamentCosts[material] ?? 29
  const filamentCost = (100 / 1000) * perKg * qty
  const costCents  = Math.round(filamentCost * 100)
  const priceCents = Math.ceil(costCents / (1 - 0.35))
  return { costCents, priceCents }
}
