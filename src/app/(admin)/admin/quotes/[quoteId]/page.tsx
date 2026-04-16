'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SupplierCartButton } from '@/components/admin/SupplierCartButton'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

export default function AdminQuoteDetailPage({ params }: { params: { quoteId: string } }) {
  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('quotes')
      .select('*, orders(order_number, product_type, profiles(email, full_name))')
      .eq('id', params.quoteId)
      .single()
      .then(({ data }) => { setQuote(data); setLoading(false) })
  }, [params.quoteId])

  async function sendQuote() {
    setSending(true)
    const res = await fetch(`/api/quotes/${params.quoteId}/send`, { method: 'POST' })
    if (!res.ok) {
      toast.error('Failed to send quote.')
    } else {
      toast.success('Quote sent to customer!')
      setQuote((q: any) => ({ ...q, status: 'sent' }))
    }
    setSending(false)
  }

  if (loading) return <div className="p-10 text-center text-gray-400">Loading...</div>
  if (!quote) return <div className="p-10 text-center text-gray-400">Quote not found.</div>

  const customer = quote.orders?.profiles
  const orderNumber = quote.orders?.order_number

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/admin/quotes" className="text-sm text-indigo-600 hover:underline">← Quotes</Link>
      <div className="mt-2 mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{quote.quote_number}</h1>
          <p className="text-sm text-gray-400">
            Order <Link href={`/admin/orders/${quote.order_id}`} className="text-indigo-600 hover:underline">{orderNumber}</Link>
            {' '}&middot; {customer?.full_name ?? customer?.email}
          </p>
        </div>
        <Badge status={quote.status} className="text-sm" />
      </div>

      <Card className="mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 font-medium text-right">Qty</th>
              <th className="pb-2 font-medium text-right">Unit</th>
              <th className="pb-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {(quote.line_items ?? []).map((item: any) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="py-2 text-gray-700">{item.description}</td>
                <td className="py-2 text-right text-gray-500">{item.quantity}</td>
                <td className="py-2 text-right text-gray-500">{formatCurrency(item.unit_price_cents)}</td>
                <td className="py-2 text-right font-medium">{formatCurrency(item.total_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex flex-col items-end gap-1 text-sm border-t pt-4">
          <p className="text-gray-500">Subtotal: {formatCurrency(quote.subtotal_cents)}</p>
          {quote.tax_cents > 0 && <p className="text-gray-500">Tax: {formatCurrency(quote.tax_cents)}</p>}
          <p className="text-lg font-bold">Total: {formatCurrency(quote.total_cents)}</p>
        </div>

        {quote.valid_until && <p className="mt-3 text-xs text-gray-400">Valid until {formatDate(quote.valid_until)}</p>}
      </Card>

      {quote.notes && (
        <Card className="mb-4" header={<span className="font-semibold">Notes to customer</span>}>
          <p className="text-sm text-gray-600">{quote.notes}</p>
        </Card>
      )}

      {quote.internal_notes && (
        <Card className="mb-6" header={<span className="font-semibold">Internal notes</span>}>
          <p className="text-sm text-gray-600">{quote.internal_notes}</p>
        </Card>
      )}

      {quote.status === 'draft' && (
        <div className="flex flex-wrap gap-3">
          <Link href={`/admin/quotes/new?orderId=${quote.order_id}`}>
            <Button variant="secondary">Edit quote</Button>
          </Link>
          <Button onClick={sendQuote} loading={sending}>Send to customer</Button>
        </div>
      )}

      {quote.status === 'accepted' && (
        <Link href={`/admin/invoices?createFrom=${params.quoteId}`}>
          <Button>Create invoice from this quote</Button>
        </Link>
      )}

      <div className="mt-2">
        <DeleteButton
          apiPath={`/api/quotes/${params.quoteId}`}
          redirectTo="/admin/quotes"
          label="quote"
          confirmMessage={`Delete quote ${quote.quote_number}?`}
        />
      </div>

      <div className="mt-4">
        <SupplierCartButton
          quoteId={params.quoteId}
          isShirtOrder={quote.orders?.product_type === 'shirt'}
        />
      </div>
    </div>
  )
}
