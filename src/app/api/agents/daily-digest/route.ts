import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const today = now.toISOString().slice(0, 10)
  const ts = now.getTime()
  const HOURS_48 = 48 * 60 * 60 * 1000
  const DAYS_3   = 3 * 24 * 60 * 60 * 1000

  const [
    { data: activeOrders },
    { data: monthInvoices },
    { data: sentQuotes },
    { data: pendingOrders },
    { data: overdueInv },
    { data: draftQuotes },
  ] = await Promise.all([
    service.from('orders').select('id, status, created_at').neq('status', 'complete').neq('status', 'cancelled'),
    service.from('invoices').select('total_cents, status').gte('created_at', monthStart),
    service.from('quotes').select('id, quote_number, sent_at, total_cents, orders(order_number, profiles(full_name, email))').eq('status', 'sent').not('sent_at', 'is', null),
    service.from('orders').select('id, order_number, status, updated_at, profiles(full_name, email)').in('status', ['received', 'in_review']),
    service.from('invoices').select('id, invoice_number, due_date, total_cents, orders(order_number, profiles(full_name, email))').eq('status', 'sent').lt('due_date', today).not('due_date', 'is', null),
    service.from('quotes').select('id').eq('status', 'draft'),
  ])

  // Pipeline counts
  const pipeline: Record<string, number> = { received: 0, in_review: 0, quoted: 0, approved: 0, in_production: 0, shipped: 0 }
  for (const o of activeOrders ?? []) {
    if (o.status in pipeline) pipeline[o.status]++
  }
  const newToday = (activeOrders ?? []).filter(o => o.created_at.slice(0, 10) === today).length

  // Revenue
  const invoicedCents   = (monthInvoices ?? []).reduce((s, i) => s + i.total_cents, 0)
  const collectedCents  = (monthInvoices ?? []).filter(i => i.status === 'paid').reduce((s, i) => s + i.total_cents, 0)

  // Action items
  const staleQuotes = (sentQuotes ?? [])
    .filter(q => ts - new Date(q.sent_at!).getTime() > HOURS_48)
    .map(q => ({
      id: q.id,
      quote_number: q.quote_number,
      customer: (q.orders as any)?.profiles?.full_name ?? (q.orders as any)?.profiles?.email,
      order_number: (q.orders as any)?.order_number,
      hours: Math.floor((ts - new Date(q.sent_at!).getTime()) / 3_600_000),
      total_cents: q.total_cents,
    }))

  const stuckOrders = (pendingOrders ?? [])
    .filter(o => ts - new Date(o.updated_at).getTime() > DAYS_3)
    .map(o => ({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      customer: (o.profiles as any)?.full_name ?? (o.profiles as any)?.email,
      days: Math.floor((ts - new Date(o.updated_at).getTime()) / 86_400_000),
    }))

  const overdueInvoices = (overdueInv ?? []).map(i => ({
    id: i.id,
    invoice_number: i.invoice_number,
    customer: (i.orders as any)?.profiles?.full_name ?? (i.orders as any)?.profiles?.email,
    order_number: (i.orders as any)?.order_number,
    due_date: i.due_date,
    days_overdue: Math.floor((ts - new Date(i.due_date!).getTime()) / 86_400_000),
    total_cents: i.total_cents,
  }))

  return NextResponse.json({
    new_today: newToday,
    pipeline,
    invoiced_cents: invoicedCents,
    collected_cents: collectedCents,
    outstanding_cents: invoicedCents - collectedCents,
    draft_quotes: draftQuotes?.length ?? 0,
    stale_quotes: staleQuotes,
    stuck_orders: stuckOrders,
    overdue_invoices: overdueInvoices,
    total_flags: staleQuotes.length + stuckOrders.length + overdueInvoices.length,
  })
}
