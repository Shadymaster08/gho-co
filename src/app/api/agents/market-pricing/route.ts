import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { product_type, description, quantity, our_price_cents } = await request.json()
  if (!product_type) return NextResponse.json({ error: 'product_type required' }, { status: 400 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const productContext: Record<string, string> = {
    shirt: 'custom printed T-shirts/apparel using DTF (Direct-to-Film) heat transfer printing',
    '3d_print': 'custom FDM 3D printed objects using PLA/PETG/TPU filament',
    diy: 'custom DIY/handmade products and projects',
    lighting: 'custom LED lighting installations and fixtures',
  }

  const context = productContext[product_type] ?? product_type
  const ourPrice = our_price_cents ? `$${(our_price_cents / 100).toFixed(2)} CAD` : 'not specified'
  const qty = quantity ? `Quantity: ${quantity}` : ''
  const desc = description ? `Description: ${description}` : ''

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `You are a pricing expert for a small custom manufacturing business in Canada (Quebec/Ontario market). The business makes ${context}.

${desc}
${qty}
Our calculated price: ${ourPrice}

Analyze the Canadian market for this type of product and return ONLY valid JSON:
{
  "market_low_cents": <low end of market range in CAD cents, integer>,
  "market_mid_cents": <mid/typical market price in CAD cents, integer>,
  "market_high_cents": <premium market price in CAD cents, integer>,
  "assessment": "underpriced" | "competitive" | "premium" | "unknown",
  "assessment_note": "<one sentence explaining our price vs market>",
  "reasoning": "<2-3 sentences on Canadian market context for this product type>",
  "tips": ["<pricing tip 1>", "<pricing tip 2>"]
}

Base your ranges on actual Canadian market rates (Etsy Canada, local print shops, Shopify stores). Account for small-batch custom work, not mass production. All monetary values in CAD cents.`,
    }],
  })

  const text = (response.content[0] as { type: string; text: string }).text.trim()

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Failed to parse market data', raw: text }, { status: 422 })
  }
}
