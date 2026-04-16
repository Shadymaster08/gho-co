/**
 * Supplier Scout Agent
 *
 * Compares your current supplier prices against a curated database of
 * known Canadian / North American alternatives. No external API needed.
 *
 * POST — run a new scout (admin only)
 * GET  — return the 5 most recent reports (admin only)
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend/client'

// ── Alternative supplier knowledge base ──────────────────────────────────────
// Each entry maps to one or more price_config categories.
// price_cents is our best estimate per the same unit as price_configs.

interface Alternative {
  name: string
  url: string
  category: 'shirts' | 'dtf' | 'filament'
  applies_to: string[]          // price_config ids this alternative covers
  price_cents: number           // same unit as price_configs value_cents
  unit: string
  notes: string
}

const ALTERNATIVES: Alternative[] = [
  // ── Blank apparel ──────────────────────────────────────────────────────────
  {
    name: 'S&S Activewear Canada',
    url: 'https://www.ssactivewear.com/',
    category: 'shirts',
    applies_to: ['shirt_tshirt'],
    price_cents: 270,
    unit: 'per_unit',
    notes: 'Gildan 5000 Heavy Cotton equivalent. Free shipping over $200. Ships from Canadian DC.',
  },
  {
    name: 'alphabroder Canada',
    url: 'https://www.alphabroder.ca/',
    category: 'shirts',
    applies_to: ['shirt_tshirt', 'shirt_longsleeve', 'shirt_crewneck', 'shirt_hoodie', 'shirt_ziphoodie'],
    price_cents: 280,
    unit: 'per_unit',
    notes: 'Large Canadian wholesale distributor. Volume discounts available. Carries full Gildan range.',
  },
  {
    name: 'Blank Activewear',
    url: 'https://www.blankactivewear.com/',
    category: 'shirts',
    applies_to: ['shirt_tshirt', 'shirt_longsleeve', 'shirt_crewneck', 'shirt_hoodie'],
    price_cents: 290,
    unit: 'per_unit',
    notes: 'Canadian-based. No minimum orders. Same-day shipping on in-stock items.',
  },
  {
    name: 'SanMar Canada',
    url: 'https://www.sanmar.com/',
    category: 'shirts',
    applies_to: ['shirt_hoodie', 'shirt_ziphoodie', 'shirt_crewneck'],
    price_cents: 1550,
    unit: 'per_unit',
    notes: 'Port & Company hoodies from ~$15.50. Ships to Canada. Strong on fleece category.',
  },
  // ── DTF transfers ──────────────────────────────────────────────────────────
  {
    name: 'Transfer Express',
    url: 'https://www.transferexpress.com/',
    category: 'dtf',
    applies_to: ['dtf_per_sqin'],
    price_cents: 2,
    unit: 'per_sqin',
    notes: 'US-based. Comparable $0.02/sq in pricing. Cold-peel DTF. Bulk pricing available.',
  },
  {
    name: 'DTF Superstore',
    url: 'https://www.dtfsuperstore.com/',
    category: 'dtf',
    applies_to: ['dtf_per_sqin'],
    price_cents: 1,
    unit: 'per_sqin',
    notes: 'From ~$0.01–0.015/sq in on larger orders. US-based. Check shipping costs to Canada.',
  },
  {
    name: "Stahls' Canada",
    url: 'https://www.stahls.ca/',
    category: 'dtf',
    applies_to: ['dtf_per_sqin'],
    price_cents: 2,
    unit: 'per_sqin',
    notes: 'Canadian supplier — avoids cross-border duties. Also carries heat transfer vinyl and equipment.',
  },
  // ── Filament ───────────────────────────────────────────────────────────────
  {
    name: 'eSUN (via Amazon.ca)',
    url: 'https://www.amazon.ca/s?k=esun+pla+filament+1.75mm',
    category: 'filament',
    applies_to: ['filament_pla_basic', 'filament_pla_matte'],
    price_cents: 2000,
    unit: 'per_kg',
    notes: 'eSUN PLA+ ~$20/kg on Amazon.ca. Compatible with Bambu A1. Good quality for functional prints.',
  },
  {
    name: 'Polymaker (via Amazon.ca)',
    url: 'https://www.amazon.ca/s?k=polymaker+pla+filament+1.75mm',
    category: 'filament',
    applies_to: ['filament_pla_basic', 'filament_pla_silk', 'filament_pla_matte'],
    price_cents: 2300,
    unit: 'per_kg',
    notes: 'PolyLite PLA ~$23/kg. Silk PLA ~$25/kg. Bambu A1 compatible. Excellent consistency.',
  },
  {
    name: 'SUNLU (via Amazon.ca)',
    url: 'https://www.amazon.ca/s?k=sunlu+pla+filament+1.75mm',
    category: 'filament',
    applies_to: ['filament_pla_basic', 'filament_petg'],
    price_cents: 1800,
    unit: 'per_kg',
    notes: 'Budget option ~$18/kg. PETG ~$19/kg. Works on Bambu A1. Quality is good for decorative prints.',
  },
  {
    name: 'Hatchbox (via Amazon.ca)',
    url: 'https://www.amazon.ca/s?k=hatchbox+filament+1.75mm',
    category: 'filament',
    applies_to: ['filament_pla_basic', 'filament_petg', 'filament_tpu'],
    price_cents: 2200,
    unit: 'per_kg',
    notes: '~$22/kg PLA, ~$24/kg PETG. Well-regarded reliability. TPU ~$28/kg. Ships fast via Amazon.',
  },
  {
    name: 'MatterHackers',
    url: 'https://www.matterhackers.com/',
    category: 'filament',
    applies_to: ['filament_tpu', 'filament_pla_silk'],
    price_cents: 2800,
    unit: 'per_kg',
    notes: 'NinjaTek TPU from ~$28/kg. High quality specialty materials. Ships to Canada.',
  },
]

interface Finding {
  category: string
  item: string
  current_supplier: string
  current_price: string
  alternative_name: string
  alternative_url: string
  estimated_price: string
  estimated_saving_pct: number
  notes: string
}

function formatPrice(cents: number, unit: string) {
  const dollars = (cents / 100).toFixed(2)
  const unitLabel: Record<string, string> = {
    per_unit: '/unit',
    per_sqin: '/sq in',
    per_kg: '/kg',
  }
  return `$${dollars}${unitLabel[unit] ?? ''}`
}

// ── GET — recent reports ─────────────────────────────────────────────────────
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient()
  const { data: reports } = await service
    .from('supplier_scout_reports')
    .select('*')
    .order('ran_at', { ascending: false })
    .limit(5)

  return NextResponse.json({ reports: reports ?? [] })
}

// ── POST — run scout ─────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email, full_name')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { triggered_by = 'manual' } = await request.json().catch(() => ({}))

  const service = createServiceClient()

  // Fetch current prices
  const { data: prices } = await service
    .from('price_configs')
    .select('id, label, category, value_cents, unit, supplier')

  if (!prices || prices.length === 0) {
    return NextResponse.json({ error: 'No price configs found. Run migration 003 first.' }, { status: 400 })
  }

  // Build a lookup of current prices by id
  const priceMap = Object.fromEntries(prices.map(p => [p.id, p]))

  // Compare each alternative against current prices
  const findings: Finding[] = []

  for (const alt of ALTERNATIVES) {
    for (const priceId of alt.applies_to) {
      const current = priceMap[priceId]
      if (!current) continue

      // Only flag if alternative is genuinely cheaper (>5% saving)
      const saving = (current.value_cents - alt.price_cents) / current.value_cents
      if (saving <= 0.05) continue

      // Avoid duplicate findings for the same alternative + category
      const alreadyAdded = findings.some(
        f => f.alternative_name === alt.name && f.category === alt.category
      )
      if (alreadyAdded) continue

      findings.push({
        category: alt.category,
        item: current.label,
        current_supplier: current.supplier ?? 'Unknown',
        current_price: formatPrice(current.value_cents, current.unit),
        alternative_name: alt.name,
        alternative_url: alt.url,
        estimated_price: formatPrice(alt.price_cents, alt.unit),
        estimated_saving_pct: Math.round(saving * 100),
        notes: alt.notes,
      })
    }
  }

  // Sort by saving % descending
  findings.sort((a, b) => b.estimated_saving_pct - a.estimated_saving_pct)

  // Save report
  const { data: report, error: dbErr } = await service
    .from('supplier_scout_reports')
    .insert({ findings, total_findings: findings.length, triggered_by, email_sent: false })
    .select()
    .single()

  if (dbErr) {
    console.error('Scout DB error:', dbErr)
    return NextResponse.json({ error: 'Failed to save report' }, { status: 500 })
  }

  // Send email if there are findings
  let emailSent = false
  if (findings.length > 0) {
    const notifyEmail = process.env.ADMIN_NOTIFY_EMAIL ?? 'cg.designs08@gmail.com'

    const findingsHtml = findings.map(f => `
      <tr>
        <td style="padding:12px 8px;border-bottom:1px solid #f3f4f6">
          <strong style="color:#1d1d1f">${f.item}</strong><br>
          <small style="color:#86868b">${f.category}</small>
        </td>
        <td style="padding:12px 8px;border-bottom:1px solid #f3f4f6;color:#6e6e73">
          ${f.current_supplier}<br><small>${f.current_price}</small>
        </td>
        <td style="padding:12px 8px;border-bottom:1px solid #f3f4f6">
          <a href="${f.alternative_url}" style="color:#0071e3;font-weight:600;text-decoration:none">${f.alternative_name}</a><br>
          <small style="color:#6e6e73">${f.estimated_price}</small>
        </td>
        <td style="padding:12px 8px;border-bottom:1px solid #f3f4f6;text-align:center">
          <span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700">
            ~${f.estimated_saving_pct}% less
          </span>
        </td>
        <td style="padding:12px 8px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6e6e73;max-width:180px">${f.notes}</td>
      </tr>
    `).join('')

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:720px;margin:0 auto">
        <div style="background:#1d1d1f;padding:32px;border-radius:16px 16px 0 0">
          <h1 style="color:white;margin:0;font-size:22px">Gho&amp;Co — Supplier Scout Report</h1>
          <p style="color:#86868b;margin:8px 0 0">
            Found <strong style="color:white">${findings.length} saving opportunit${findings.length === 1 ? 'y' : 'ies'}</strong>
            &nbsp;·&nbsp;${new Date().toLocaleDateString('en-CA', { dateStyle: 'long' })}
          </p>
        </div>
        <div style="background:white;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px">
          <p style="color:#6e6e73;margin:0 0 24px;font-size:14px">
            The supplier scout compared your current prices against ${ALTERNATIVES.length} known alternatives.
            Always verify pricing directly with suppliers before switching.
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <thead>
              <tr style="border-bottom:2px solid #e5e7eb;text-align:left">
                <th style="padding:8px;color:#86868b;font-weight:600;font-size:12px">ITEM</th>
                <th style="padding:8px;color:#86868b;font-weight:600;font-size:12px">CURRENT</th>
                <th style="padding:8px;color:#86868b;font-weight:600;font-size:12px">ALTERNATIVE</th>
                <th style="padding:8px;color:#86868b;font-weight:600;font-size:12px;text-align:center">SAVING</th>
                <th style="padding:8px;color:#86868b;font-weight:600;font-size:12px">NOTES</th>
              </tr>
            </thead>
            <tbody>${findingsHtml}</tbody>
          </table>
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid #f3f4f6">
            <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/admin/supplier"
               style="color:#0071e3;font-size:13px;text-decoration:none">
              View in dashboard →
            </a>
          </div>
        </div>
      </div>
    `

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
        to: notifyEmail,
        subject: `Gho&Co — ${findings.length} supplier saving${findings.length === 1 ? '' : 's'} found`,
        html,
      })
      emailSent = true
      await service.from('supplier_scout_reports').update({ email_sent: true }).eq('id', report.id)
    } catch (err) {
      console.error('Scout email error:', err)
    }
  }

  return NextResponse.json({ report_id: report.id, total_findings: findings.length, findings, email_sent: emailSent })
}
