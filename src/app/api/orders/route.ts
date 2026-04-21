import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { product_type, configuration, customer_notes, billing } = body

  if (!product_type || !configuration) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      customer_id: user.id,
      product_type,
      configuration,
      customer_notes: customer_notes ?? null,
      billing: billing ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('Order insert error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }

  // Save billing info back to profile so future orders pre-fill (non-blocking)
  if (billing) {
    supabase.from('profiles').update({
      full_name:    billing.full_name    || null,
      phone:        billing.phone        || null,
      address_line1: billing.address_line1 || null,
      address_line2: billing.address_line2 || null,
      city:         billing.city         || null,
      province:     billing.province     || null,
      postal_code:  billing.postal_code  || null,
      country:      billing.country      || null,
    }).eq('id', user.id).then(() => {})
  }

  // Send confirmation email (non-blocking)
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    if (profile) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/orders/${order.id}/send-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile.email, full_name: profile.full_name, order_number: order.order_number }),
      })
    }
  } catch {
    // Email failure should not block the order response
  }

  return NextResponse.json({ order_id: order.id, order_number: order.order_number }, { status: 201 })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const product_type = searchParams.get('product_type')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  let query = supabase
    .from('orders')
    .select('*, profiles(email, full_name)')
    .order('created_at', { ascending: false })

  if (!isAdmin) {
    query = query.eq('customer_id', user.id)
  }
  if (status) query = query.eq('status', status)
  if (product_type) query = query.eq('product_type', product_type)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })

  return NextResponse.json(data)
}
