/**
 * Agent 8 — Etsy Trend Analyzer
 *
 * Uses Groq (free tier, Llama 3.3) to analyze Etsy trends across Gho&Co's
 * four product categories. Returns trending themes, hot keywords, top listings,
 * and design ideas.
 *
 * POST — run a new scan (admin only)
 * GET  — return the 5 most recent reports (admin only)
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Groq from 'groq-sdk'

export const maxDuration = 300

type Category = 'shirts' | '3d_prints' | 'diy' | 'lighting'

const CATEGORIES: Category[] = ['shirts', '3d_prints', 'diy', 'lighting']

const SEARCH_QUERIES: Record<Category, string[]> = {
  shirts: [
    'custom shirt bestseller etsy',
    'funny t-shirt popular etsy',
    'personalized family shirt etsy',
  ],
  '3d_prints': [
    'popular 3d printed home decor etsy',
    '3d printed gift bestseller etsy',
    'articulated 3d print trending etsy',
  ],
  diy: [
    'handmade craft kit popular etsy',
    'diy home decor bestseller etsy',
    'personalized gift handmade etsy',
  ],
  lighting: [
    'custom neon sign popular etsy',
    'led lamp handmade bestseller etsy',
    'acrylic night light custom etsy',
  ],
}

const CATEGORY_LABELS: Record<Category, string> = {
  shirts: 'custom printed shirts & apparel',
  '3d_prints': '3D-printed products',
  diy: 'handmade DIY projects & custom crafts',
  lighting: 'custom lighting & illuminated signs',
}

interface Listing {
  title: string
  shop: string
  price_usd: number | null
  review_count: number | null
  url: string
  thumbnail_url: string | null
  why_it_works: string
  profit_potential: 'low' | 'medium' | 'high' | null
  profit_note: string | null
}

interface CategoryReport {
  category: Category
  trending_themes: string[]
  hot_keywords: string[]
  top_listings: Listing[]
  style_insights: string
  design_ideas_for_you: string[]
}

// ── GET — recent reports ─────────────────────────────────────────────────────
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient()
  const { data: reports } = await service
    .from('etsy_trend_reports')
    .select('*')
    .order('ran_at', { ascending: false })
    .limit(5)

  return NextResponse.json({ reports: reports ?? [] })
}

// ── POST — run a new scan ────────────────────────────────────────────────────
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
  }

  const { triggered_by = 'manual' } = await request.json().catch(() => ({}))

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const service = createServiceClient()
  const reports: CategoryReport[] = []
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  for (const [index, category] of CATEGORIES.entries()) {
    if (index > 0) await sleep(4000)
    try {
      const queries = SEARCH_QUERIES[category]
      const label = CATEGORY_LABELS[category]

      const prompt = `You are an e-commerce trend analyst for Gho&Co, a Canadian custom shop that makes ${label}.

Based on your knowledge of Etsy's marketplace, analyze what is currently popular and bestselling in this category. Consider these search angles:
${queries.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Use your knowledge of Etsy trends, popular niches, and what styles/themes drive high review counts and sales in this product category.

Produce a JSON analysis with this EXACT shape (return ONLY the JSON, no markdown fences, no prose):

{
  "trending_themes": ["theme1", "theme2"],
  "hot_keywords": ["kw1", "kw2"],
  "top_listings": [
    {
      "title": "listing title",
      "shop": "shop name",
      "price_usd": 24.99,
      "review_count": 1234,
      "url": "https://www.etsy.com/search?q=relevant+search+term",
      "thumbnail_url": null,
      "why_it_works": "One sentence on why this listing sells well.",
      "profit_potential": "high",
      "profit_note": "One sentence estimating profit potential for Gho&Co (e.g. cost to make vs Etsy price)."
    }
  ],
  "style_insights": "2-3 sentences on design patterns you notice.",
  "design_ideas_for_you": [
    "Specific project idea #1 Gho&Co could make",
    "Specific project idea #2"
  ]
}

Rules:
- trending_themes: 4-6 broad themes (e.g. "pet portraits", "minimalist", "cottagecore")
- hot_keywords: 6-10 keywords from top listing titles
- top_listings: 6-10 representative listings; set url to "https://www.etsy.com/search?q=..." with a relevant search query
- profit_potential: "high" if Etsy price is well above Gho&Co's estimated cost, "medium" if margin is decent, "low" if margins are tight (e.g. cheap commodity items). Gho&Co costs: shirts ~$10-15 all-in, 3D prints ~$5-20 depending on size, DIY/lighting $15-40 in materials
- profit_note: one sentence explaining the margin logic (e.g. "Sells for $35 on Etsy, costs ~$12 to make — strong 65% margin")
- design_ideas_for_you: 3-5 ideas specific to Gho&Co capabilities (DTF shirt printing, Bambu A1 3D printing, custom LED lighting, handmade DIY)
- Return ONLY the JSON object, nothing else`

      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
      })

      const rawText = (completion.choices[0]?.message?.content ?? '').trim()

      const jsonText = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()

      let parsed: Omit<CategoryReport, 'category'>
      try {
        parsed = JSON.parse(jsonText)
      } catch (parseErr) {
        console.error(`Failed to parse Groq response for ${category}:`, parseErr, rawText.slice(0, 500))
        reports.push({
          category,
          trending_themes: [],
          hot_keywords: [],
          top_listings: [],
          style_insights: 'Scan failed to return structured data — try re-running.',
          design_ideas_for_you: [],
        })
        continue
      }

      const validListings = (parsed.top_listings ?? []).map(l => ({
        ...l,
        url: typeof l.url === 'string' && l.url.startsWith('https://www.etsy.com')
          ? l.url
          : `https://www.etsy.com/search?q=${encodeURIComponent(l.title ?? '')}`,
      }))

      reports.push({
        category,
        trending_themes: Array.isArray(parsed.trending_themes) ? parsed.trending_themes : [],
        hot_keywords: Array.isArray(parsed.hot_keywords) ? parsed.hot_keywords : [],
        top_listings: validListings,
        style_insights: typeof parsed.style_insights === 'string' ? parsed.style_insights : '',
        design_ideas_for_you: Array.isArray(parsed.design_ideas_for_you) ? parsed.design_ideas_for_you : [],
      })
    } catch (err) {
      console.error(`Etsy trend scan failed for ${category}:`, err)
      reports.push({
        category,
        trending_themes: [],
        hot_keywords: [],
        top_listings: [],
        style_insights: `Scan failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        design_ideas_for_you: [],
      })
    }
  }

  const totalListings = reports.reduce((sum, r) => sum + r.top_listings.length, 0)

  const { data: report, error: dbErr } = await service
    .from('etsy_trend_reports')
    .insert({ findings: reports, total_listings: totalListings, triggered_by })
    .select()
    .single()

  if (dbErr) {
    console.error('Etsy trend DB error:', dbErr)
    return NextResponse.json({ error: 'Failed to save report' }, { status: 500 })
  }

  return NextResponse.json({ report_id: report.id, total_listings: totalListings, findings: reports })
}
