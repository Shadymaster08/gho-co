import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend/client'
import { QuoteSent } from '@/lib/resend/templates/QuoteSent'
import { generateMockupPng } from '@/lib/mockup/generate'

export const runtime = 'nodejs'

export async function POST(request: Request, { params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: quote } = await supabase
    .from('quotes')
    .select('*, orders(order_number, configuration, profiles(email, full_name))')
    .eq('id', quoteId)
    .single()

  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  const body = request.headers.get('content-type')?.includes('json') ? await request.json().catch(() => ({})) : {}
  const force = body?.force === true
  if (!force && quote.status !== 'draft') return NextResponse.json({ error: 'Quote already sent' }, { status: 400 })

  const customer = (quote as any).orders?.profiles
  const orderNumber = (quote as any).orders?.order_number
  const config: any = (quote as any).orders?.configuration ?? {}
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const quoteUrl = `${appUrl}/portal/quotes/${quoteId}`

  // Pre-generate mockup PNGs and upload to storage so the email gets clean CDN URLs
  async function uploadMockup(side: 'front' | 'back'): Promise<string | undefined> {
    const artworkUrl = side === 'front' ? (config.front_file_url ?? '') : (config.back_file_url ?? '')
    if (!artworkUrl) return undefined
    try {
      const style   = config.shirt_style ?? config.style_groups?.[0]?.shirt_style ?? 'tshirt'
      const color   = config.color_groups?.[0]?.color ?? config.style_groups?.[0]?.color_groups?.[0]?.color ?? 'White'
      const dtfW    = side === 'front' ? (config.dtf_front_width  ?? 12) : (config.dtf_back_width  ?? 12)
      const dtfH    = side === 'front' ? (config.dtf_front_height ?? 12) : (config.dtf_back_height ?? 12)
      const offsets = config.artwork_offsets?.[side]
      const buf = await generateMockupPng({
        style, side, color, artworkUrl,
        dtfW, dtfH,
        scale: offsets?.scale ?? 1,
        ox: offsets?.x ?? 0,
        oy: offsets?.y ?? 0,
        outputSize: 400,
      })
      if (!buf) return undefined
      const storagePath = `mockups/quote-${quoteId}-${side}.png`
      const service = createServiceClient()
      await service.storage.from('order-files').upload(storagePath, buf, {
        contentType: 'image/png',
        upsert: true,
      })
      const { data: { publicUrl } } = service.storage.from('order-files').getPublicUrl(storagePath)
      return publicUrl
    } catch {
      return undefined
    }
  }

  const [mockupFrontUrl, mockupBackUrl] = await Promise.all([
    uploadMockup('front'),
    uploadMockup('back'),
  ])

  const lineItemsText = (quote.line_items ?? [])
    .map((item: any) => `- ${item.description} x${item.quantity}: $${(item.total_cents / 100).toFixed(2)}`)
    .join('\n')

  const { data: emailData, error: emailError } = await resend.emails.send({
    from: `Gho&Co <${process.env.RESEND_FROM_EMAIL!}>`,
    replyTo: process.env.ADMIN_NOTIFY_EMAIL!,
    to: [customer.email],
    subject: `Your quote from Gho&Co - ${quote.quote_number}`,
    react: QuoteSent({
      customer_name: customer.full_name ?? customer.email,
      order_number: orderNumber,
      quote_number: quote.quote_number,
      total_cents: quote.total_cents,
      valid_until: quote.valid_until,
      quote_url: quoteUrl,
      line_items: quote.line_items,
      mockup_front_url: mockupFrontUrl,
      mockup_back_url: mockupBackUrl,
    }),
    text: `Hi ${customer.full_name ?? customer.email},\n\nWe have prepared a quote for your order ${orderNumber}.\n\n${lineItemsText}\n\nTotal: $${(quote.total_cents / 100).toFixed(2)}${quote.valid_until ? `\nValid until: ${quote.valid_until}` : ''}\n\nView and accept your quote:\n${quoteUrl}\n\nQuestions? Reply to this email.\n\nGho&Co`,
    headers: {
      'X-Entity-Ref-ID': quoteId,
    },
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
