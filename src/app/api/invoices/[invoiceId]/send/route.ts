import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend/client'
import { InvoiceSent } from '@/lib/resend/templates/InvoiceSent'

export async function POST(request: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, orders(order_number, profiles(email, full_name))')
    .eq('id', invoiceId)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const customer = (invoice as any).orders?.profiles

  const { data: emailData, error: emailError } = await resend.emails.send({
    from: `Gho&Co <${process.env.RESEND_FROM_EMAIL!}>`,
    replyTo: process.env.ADMIN_NOTIFY_EMAIL!,
    to: [customer.email],
    subject: `Your invoice from Gho&Co — ${invoice.invoice_number}`,
    react: InvoiceSent({
      customer_name: customer.full_name ?? customer.email,
      invoice_number: invoice.invoice_number,
      total_cents: invoice.total_cents,
      due_date: invoice.due_date,
      payment_instructions: invoice.payment_instructions,
      invoice_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/invoices/${invoiceId}`,
      line_items: invoice.line_items,
    }),
  })

  await supabase.from('email_log').insert({
    recipient_email: customer.email,
    template: 'invoice_sent',
    related_id: invoiceId,
    resend_message_id: emailData?.id ?? null,
    status: emailError ? 'failed' : 'sent',
    error_message: emailError?.message ?? null,
  })

  if (emailError) return NextResponse.json({ error: 'Email failed' }, { status: 500 })

  await supabase.from('invoices').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', invoiceId)

  return NextResponse.json({ success: true })
}
