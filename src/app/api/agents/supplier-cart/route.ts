import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { normalizeShirtConfig } from '@/lib/pricing'
import { runFabrikCartAutomation } from '@/lib/supplier/fabrik-automation'
import { getColorHex } from '@/lib/supplier/fabrik-catalog'
import type { CartItem, CartReadItem, AutomationResult } from '@/lib/supplier/fabrik-automation'

export interface CartValidationItem {
  style: string
  color: string
  size: string
  expectedQty: number
  foundQty: number | null
  status: 'match' | 'wrong_qty' | 'missing'
}

export interface CartValidation {
  overall: 'pass' | 'fail'
  items: CartValidationItem[]
}

export interface SupplierCartResult {
  success: boolean
  cartUrl: string
  manifest: CartItem[]
  validation: CartValidation
  error?: string
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { quoteId } = await request.json()
  if (!quoteId) return NextResponse.json({ error: 'quoteId required' }, { status: 400 })

  const serviceClient = createServiceClient()

  const { data: quote } = await serviceClient
    .from('quotes')
    .select('order_id')
    .eq('id', quoteId)
    .single()

  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })

  const { data: order } = await serviceClient
    .from('orders')
    .select('product_type, configuration')
    .eq('id', quote.order_id)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.product_type !== 'shirt') {
    return NextResponse.json({ error: 'Supplier cart automation is only available for shirt orders' }, { status: 400 })
  }

  const { color_groups } = normalizeShirtConfig(order.configuration)
  const style = (order.configuration as any).shirt_style ?? 'tshirt'

  const manifest: CartItem[] = []
  for (const group of color_groups) {
    for (const sz of group.sizes) {
      if (sz.quantity > 0) {
        manifest.push({ style, color: group.color, colorHex: getColorHex(group.color) ?? '#000000', size: sz.size, qty: sz.quantity })
      }
    }
  }

  if (manifest.length === 0) {
    return NextResponse.json({ error: 'No items to order — check the order configuration' }, { status: 400 })
  }

  const result = await runFabrikCartAutomation(manifest)

  const validation = validateCart(manifest, result.cartItems)

  const response: SupplierCartResult = {
    success: result.success,
    cartUrl: result.cartUrl,
    manifest,
    validation,
    error: result.error,
  }

  return NextResponse.json(response)
}

function validateCart(expected: CartItem[], actual: CartReadItem[]): CartValidation {
  const items: CartValidationItem[] = expected.map(exp => {
    // Match cart items by looking for the color+size in the description text
    const match = actual.find(a =>
      a.description.toLowerCase().includes(exp.color.toLowerCase()) &&
      a.description.toLowerCase().includes(exp.size.toLowerCase())
    )

    if (!match) {
      return { ...exp, expectedQty: exp.qty, foundQty: null, status: 'missing' }
    }
    if (match.qty !== exp.qty) {
      return { ...exp, expectedQty: exp.qty, foundQty: match.qty, status: 'wrong_qty' }
    }
    return { ...exp, expectedQty: exp.qty, foundQty: match.qty, status: 'match' }
  })

  return {
    overall: items.every(i => i.status === 'match') ? 'pass' : 'fail',
    items,
  }
}
