import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { printfulPost } from '@/lib/printful/client'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { order_id, printful_variant_id, quantity, recipient } = await request.json()

  const { data: order } = await supabase
    .from('orders')
    .select('configuration, product_type')
    .eq('id', order_id)
    .single()

  if (!order || order.product_type !== 'shirt') {
    return NextResponse.json({ error: 'Only shirt orders can be sent to Printful' }, { status: 400 })
  }

  const config = order.configuration as any
  const files: Array<{ type: string; url: string }> = []
  if (config.front_file_url) files.push({ type: 'front', url: config.front_file_url })
  if (config.back_file_url) files.push({ type: 'back', url: config.back_file_url })

  try {
    const printfulOrder = await printfulPost('/v2/orders', {
      recipient: recipient ?? {
        name: 'Gho&Co',
        address1: '123 Shop Street',
        city: 'Montreal',
        state_code: 'QC',
        country_code: 'CA',
        zip: 'H1A 1A1',
      },
      items: [{
        variant_id: printful_variant_id,
        quantity,
        files,
      }],
    })

    await supabase.from('orders').update({
      printful_order_id: String(printfulOrder.result?.id ?? ''),
      printful_status: 'pending',
      status: 'in_production',
    }).eq('id', order_id)

    return NextResponse.json({ success: true, printful_order: printfulOrder.result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
