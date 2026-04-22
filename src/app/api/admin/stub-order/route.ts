import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { customer_id } = await request.json()
  if (!customer_id) return NextResponse.json({ error: 'customer_id required' }, { status: 400 })

  const service = createServiceClient()
  const { data: order, error } = await service
    .from('orders')
    .insert({ customer_id, product_type: 'diy', configuration: { custom_quote: true }, status: 'in_review' })
    .select('id, order_number')
    .single()

  if (error) return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  return NextResponse.json({ order_id: order.id, order_number: order.order_number }, { status: 201 })
}
