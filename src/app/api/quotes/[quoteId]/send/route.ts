import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend/client'
import { QuoteSent } from '@/lib/resend/templates/QuoteSent'

export async function POST(request: Request, { params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: quote } = await supabase
    .from('quotes')
    .select('*, orders(order_number, profiles(email, full_name))')
    .eq('id', quoteId)
    .single()

  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  if (quote.status !== 'draft') return NextResponse.json({ error: 'Quote already sent' }, { status: 400 })

  const customer = (quote as any).orders?.profiles
  const orderNumber = (quote as any).orders?.order_number

  const { data: emailData, error: emailError } = await resend.emails.send({
    from: `Gho&Co <${process.env.RESEND_FROM_EMAIL!}>`,
    replyTo: process.env.ADMIN_NOTIFY_EMAIL!,
    to: [customer.email],
    subject: `Your quote from Gho&Co — ${quote.quote_number}`,
    react: QuoteSent({
      customer_name: customer.full_name ?? customer.email,
      order_number: orderNumber,
      quote_number: quote.quote_number,
      total_cents: quote.total_cents,
      valid_until: quote.valid_until,
      quote_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/quotes/${quoteId}`,
      line_items: quote.line_items,
    }),
  })

  await supabase.from('email_log').insert({
    recipient_email: customer.email,
    template: 'quote_sent',
    related_id: quoteId,
    resend_message_id: emailData?.id ?? null,
    status: emailError ? 'failed' : 'sent',
    error_message: emailError?.message ?? null,
  })

  if (emailError) return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })

  await supabase.from('quotes').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', quoteId)
  await supabase.from('orders').update({ status: 'quoted' }).eq('id', quote.order_id)

  return NextResponse.json({ success: true })
}
