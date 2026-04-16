/**
 * Price-Check Agent
 *
 * GET  — returns all price configs with staleness status
 * POST — updates a price and marks it verified
 * PUT  — marks a price as verified without changing the value
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const STALE_DAYS = 30  // flag prices not verified in 30+ days

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: prices, error } = await supabase
    .from('price_configs')
    .select('*')
    .order('category')
    .order('id')

  if (error) return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 })

  const now = Date.now()
  const staleMs = STALE_DAYS * 24 * 60 * 60 * 1000

  const enriched = (prices ?? []).map(p => {
    const lastVerified = p.last_verified_at ? new Date(p.last_verified_at).getTime() : null
    const daysAgo = lastVerified ? Math.floor((now - lastVerified) / (1000 * 60 * 60 * 24)) : null
    const stale = !lastVerified || (now - lastVerified) > staleMs

    return { ...p, stale, days_since_verified: daysAgo }
  })

  const staleCount = enriched.filter(p => p.stale).length

  return NextResponse.json({ prices: enriched, stale_count: staleCount, stale_days_threshold: STALE_DAYS })
}

// Update price value
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, value_cents } = await request.json()
  if (!id || value_cents == null) return NextResponse.json({ error: 'id and value_cents required' }, { status: 400 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('price_configs')
    .update({ value_cents, last_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  return NextResponse.json(data)
}

// Mark as verified without changing value
export async function PUT(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('price_configs')
    .update({ last_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  return NextResponse.json(data)
}
