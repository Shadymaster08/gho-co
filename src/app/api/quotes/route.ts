import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { order_id, line_items, tax_rate, valid_until, notes, internal_notes, material_cost_cents } = body

  const subtotal = (line_items ?? []).reduce((sum: number, item: any) => sum + item.total_cents, 0)
  const rate = parseFloat(tax_rate ?? '0') || 0
  const tax = Math.round(subtotal * rate)
  const total = subtotal + tax

  const { data: quote, error } = await supabase
    .from('quotes')
    .insert({
      order_id,
      created_by: user.id,
      line_items: line_items ?? [],
      subtotal_cents: subtotal,
      tax_rate: rate,
      tax_cents: tax,
      total_cents: total,
      valid_until: valid_until || null,
      notes: notes || null,
      internal_notes: internal_notes || null,
      material_cost_cents: material_cost_cents ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 })

  return NextResponse.json(quote, { status: 201 })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('quotes')
    .select('*, orders(order_number, product_type, profiles(email, full_name))')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
  return NextResponse.json(data)
}
