import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createHmac } from 'crypto'

const PRINTFUL_STATUS_MAP: Record<string, string> = {
  draft: 'in_review',
  pending: 'in_production',
  inprocess: 'in_production',
  in_process: 'in_production',
  fulfilled: 'shipped',
  canceled: 'cancelled',
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('X-Printful-Signature')

  if (process.env.PRINTFUL_WEBHOOK_SECRET && signature) {
    const expected = createHmac('sha256', process.env.PRINTFUL_WEBHOOK_SECRET)
      .update(body)
      .digest('hex')

    if (signature !== expected) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  const payload = JSON.parse(body)
  const { type, data } = payload

  if (type !== 'order_updated' && type !== 'order_shipped') {
    return NextResponse.json({ ok: true })
  }

  const printfulOrderId = String(data?.order?.id ?? '')
  const printfulStatus = (data?.order?.status ?? '').toLowerCase()
  const internalStatus = PRINTFUL_STATUS_MAP[printfulStatus]

  if (!printfulOrderId || !internalStatus) {
    return NextResponse.json({ ok: true })
  }

  const supabase = createServiceClient()
  await supabase
    .from('orders')
    .update({ printful_status: printfulStatus, status: internalStatus })
    .eq('printful_order_id', printfulOrderId)

  return NextResponse.json({ ok: true })
}
