import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: Request, { params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const client = profile?.role === 'admin' ? createServiceClient() : supabase

  const { data: quote, error } = await client
    .from('quotes')
    .select('*, orders(order_number, product_type, configuration, profiles(email, full_name))')
    .eq('id', quoteId)
    .single()

  if (error || !quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(quote)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  // Customers can only accept or decline a sent quote
  if (!isAdmin) {
    const { status, decline_reason } = body
    if (status !== 'accepted' && status !== 'declined') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify ownership via RLS-enabled client
    const { data: current } = await supabase
      .from('quotes')
      .select('status, order_id')
      .eq('id', quoteId)
      .single()
    if (!current) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    if (current.status !== 'sent') return NextResponse.json({ error: 'Quote cannot be updated' }, { status: 400 })

    const update: any = { status }
    if (status === 'accepted') update.accepted_at = new Date().toISOString()
    if (status === 'declined') {
      update.declined_at = new Date().toISOString()
      if (decline_reason?.trim()) {
        update.internal_notes = `Decline reason: ${decline_reason.trim()}`
      }
    }

    // Use service client for the actual update — customers don't have UPDATE RLS on quotes
    const service = createServiceClient()
    const { data, error } = await service
      .from('quotes')
      .update(update)
      .eq('id', quoteId)
      .select()
      .single()

    if (status === 'accepted' && current.order_id) {
      await service.from('orders').update({ status: 'approved' }).eq('id', current.order_id)
    }

    if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    return NextResponse.json(data)
  }

  // Admin full update
  const { line_items, tax_rate, valid_until, notes, internal_notes, status, material_cost_cents } = body
  const update: Record<string, unknown> = {}

  if (line_items !== undefined) {
    const subtotal = line_items.reduce((sum: number, item: any) => sum + item.total_cents, 0)
    const rate = parseFloat(tax_rate ?? '0') || 0
    const tax = Math.round(subtotal * rate)
    update.line_items = line_items
    update.subtotal_cents = subtotal
    update.tax_rate = rate
    update.tax_cents = tax
    update.total_cents = subtotal + tax
  }
  if (valid_until !== undefined) update.valid_until = valid_until
  if (notes !== undefined) update.notes = notes
  if (internal_notes !== undefined) update.internal_notes = internal_notes
  if (status !== undefined) update.status = status
  if (material_cost_cents !== undefined) update.material_cost_cents = material_cost_cents

  const { data, error } = await supabase.from('quotes').update(update).eq('id', quoteId).select().single()
  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const serviceClient = createServiceClient()
  await serviceClient.from('quotes').delete().eq('id', quoteId)
  return NextResponse.json({ success: true })
}
