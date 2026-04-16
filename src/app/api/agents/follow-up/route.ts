/**
 * Follow-up Monitor Agent
 *
 * Scans for:
 *   1. Quotes sent but not accepted/declined after 48 hours → flag as stale
 *   2. Orders stuck in 'received' or 'in_review' for 3+ days → flag as overdue
 *   3. Invoices sent but unpaid past their due date → flag as overdue
 *
 * Returns a summary report. Call this via a cron job or from the admin dashboard.
 * Requires admin auth.
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const HOURS_48 = 48 * 60 * 60 * 1000
const DAYS_3   = 3  * 24 * 60 * 60 * 1000

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient()
  const now = Date.now()

  // ── 1. Stale quotes (sent, no response in 48h) ───────────────────────────
  const { data: sentQuotes } = await service
    .from('quotes')
    .select('id, quote_number, order_id, sent_at, total_cents, orders(order_number, profiles(email, full_name))')
    .eq('status', 'sent')
    .not('sent_at', 'is', null)

  const staleQuotes = (sentQuotes ?? []).filter(q => {
    const sentAt = new Date(q.sent_at!).getTime()
    return now - sentAt > HOURS_48
  }).map(q => ({
    quote_number: q.quote_number,
    quote_id: q.id,
    order_number: (q.orders as any)?.order_number,
    customer: (q.orders as any)?.profiles?.full_name ?? (q.orders as any)?.profiles?.email,
    sent_at: q.sent_at,
    hours_waiting: Math.floor((now - new Date(q.sent_at!).getTime()) / (1000 * 60 * 60)),
    total_cents: q.total_cents,
  }))

  // ── 2. Orders stuck in received / in_review for 3+ days ─────────────────
  const { data: pendingOrders } = await service
    .from('orders')
    .select('id, order_number, status, product_type, updated_at, profiles(email, full_name)')
    .in('status', ['received', 'in_review'])

  const stuckOrders = (pendingOrders ?? []).filter(o => {
    const updatedAt = new Date(o.updated_at).getTime()
    return now - updatedAt > DAYS_3
  }).map(o => ({
    order_number: o.order_number,
    order_id: o.id,
    status: o.status,
    product_type: o.product_type,
    customer: (o.profiles as any)?.full_name ?? (o.profiles as any)?.email,
    days_waiting: Math.floor((now - new Date(o.updated_at).getTime()) / (1000 * 60 * 60 * 24)),
    last_updated: o.updated_at,
  }))

  // ── 3. Overdue invoices (sent, past due_date, unpaid) ────────────────────
  const { data: sentInvoices } = await service
    .from('invoices')
    .select('id, invoice_number, order_id, due_date, total_cents, sent_at, orders(order_number, profiles(email, full_name))')
    .eq('status', 'sent')
    .not('due_date', 'is', null)

  const today = new Date().toISOString().split('T')[0]
  const overdueInvoices = (sentInvoices ?? []).filter(inv => inv.due_date! < today).map(inv => ({
    invoice_number: inv.invoice_number,
    invoice_id: inv.id,
    order_number: (inv.orders as any)?.order_number,
    customer: (inv.orders as any)?.profiles?.full_name ?? (inv.orders as any)?.profiles?.email,
    due_date: inv.due_date,
    days_overdue: Math.floor((now - new Date(inv.due_date!).getTime()) / (1000 * 60 * 60 * 24)),
    total_cents: inv.total_cents,
  }))

  // ── Summary ──────────────────────────────────────────────────────────────
  const totalFlags = staleQuotes.length + stuckOrders.length + overdueInvoices.length

  return NextResponse.json({
    scanned_at: new Date().toISOString(),
    total_flags: totalFlags,
    stale_quotes: staleQuotes,
    stuck_orders: stuckOrders,
    overdue_invoices: overdueInvoices,
  })
}
