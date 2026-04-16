import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { order_id, quote_id, line_items: bodyItems, tax_rate, due_date, notes, payment_instructions } = body

  let line_items = bodyItems ?? []
  let subtotal = 0
  let rate = parseFloat(tax_rate ?? '0') || 0

  // Prefill from accepted quote if provided
  if (quote_id && !bodyItems) {
    const { data: quote } = await supabase.from('quotes').select('*').eq('id', quote_id).single()
    if (quote) {
      line_items = quote.line_items
      subtotal = quote.subtotal_cents
      rate = quote.tax_rate
    }
  } else {
    subtotal = line_items.reduce((sum: number, i: any) => sum + i.total_cents, 0)
  }

  if (subtotal === 0) subtotal = line_items.reduce((sum: number, i: any) => sum + i.total_cents, 0)

  const tax = Math.round(subtotal * rate)
  const total = subtotal + tax

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      order_id,
      quote_id: quote_id ?? null,
      created_by: user.id,
      line_items,
      subtotal_cents: subtotal,
      tax_rate: rate,
      tax_cents: tax,
      total_cents: total,
      due_date: due_date || null,
      notes: notes || null,
      payment_instructions: payment_instructions || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
  return NextResponse.json(invoice, { status: 201 })
}

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('invoices')
    .select('*, orders(order_number, profiles(email, full_name))')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed' }, { status: 500 })
  return NextResponse.json(data)
}
