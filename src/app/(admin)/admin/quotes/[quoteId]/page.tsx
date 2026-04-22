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
import { useParams } from 'next/navigation'

const QC_GST  = 0.05
const QC_QST  = 0.09975
const QC_RATE = QC_GST + QC_QST

export default function AdminQuoteDetailPage() {
  const { quoteId } = useParams<{ quoteId: string }>()
  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [savingTax, setSavingTax] = useState(false)

  useEffect(() => {
    fetch(`/api/quotes/${quoteId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { setQuote(data); setLoading(false) })
  }, [quoteId])

  async function sendQuote(force = false) {
    setSending(true)
    const res = await fetch(`/api/quotes/${quoteId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force }),
    })
    if (!res.ok) toast.error('Failed to send quote.')
    else { toast.success(force ? 'Quote resent to customer!' : 'Quote sent to customer!'); setQuote((q: any) => ({ ...q, status: 'sent' })) }
    setSending(false)
  }

  async function setTaxRate(rate: number) {
    setSavingTax(true)
    const res = await fetch(`/api/quotes/${quoteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line_items: quote.line_items, tax_rate: String(rate) }),
    })
    if (!res.ok) {
      toast.error('Failed to update tax.')
    } else {
      const updated = await res.json()
      setQuote((q: any) => ({ ...q, ...updated }))
      toast.success(rate > 0 ? 'Quebec tax applied.' : 'Tax removed.')
    }
    setSavingTax(false)
  }

  if (loading) return <div className="p-10 text-center text-gray-400">Loading...</div>
  if (!quote) return <div className="p-10 text-center text-gray-400">Quote not found.</div>

  const customer    = quote.orders?.profiles
  const orderNumber = quote.orders?.order_number
  const isDraft     = quote.status === 'draft'

  const lineItems: any[] = quote.line_items ?? []
  const subtotal  = quote.subtotal_cents as number
  const hasTax    = quote.tax_cents > 0
  const gstCents  = Math.round(subtotal * QC_GST)
  const qstCents  = Math.round(subtotal * QC_QST)
  const taxCents  = hasTax ? (quote.tax_cents as number) : 0
  const total     = quote.total_cents as number

  // Total units across all line items
  const totalQty    = lineItems.reduce((s, i) => s + (i.quantity ?? 1), 0)
  const perUnitPre  = totalQty > 1 ? Math.round(subtotal / totalQty) : null
  const perUnitPost = totalQty > 1 && hasTax ? Math.round(total / totalQty) : null

  // Cost analysis — only available if unit_cost_cents was stored
  const hasCostData = lineItems.some(i => i.unit_cost_cents != null)
  const totalCost   = lineItems.reduce((s, i) => s + (i.unit_cost_cents ?? 0) * (i.quantity ?? 1), 0)
  const totalProfit = subtotal - totalCost
  const overallMargin = subtotal > 0 ? (totalProfit / subtotal) * 100 : 0

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
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

      {/* Line items */}
      <Card className="mb-4">
        <div className="overflow-x-auto">
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
            {lineItems.map((item: any) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="py-2 text-gray-700">{item.description}</td>
                <td className="py-2 text-right text-gray-500">{item.quantity}</td>
                <td className="py-2 text-right text-gray-500">{formatCurrency(item.unit_price_cents)}</td>
                <td className="py-2 text-right font-medium">{formatCurrency(item.total_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {/* Pricing summary */}
        <div className="mt-4 border-t pt-4 flex flex-col gap-3">
          {/* Per-unit summary (only when >1 unit total) */}
          {perUnitPre !== null && (
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3 text-sm flex flex-wrap gap-6 items-center">
              <div>
                <p className="text-indigo-500 text-xs font-medium uppercase tracking-wide mb-0.5">Avg. price per unit (pre-tax)</p>
                <p className="text-indigo-900 font-bold text-lg">{formatCurrency(perUnitPre)}</p>
              </div>
              {perUnitPost !== null && (
                <div>
                  <p className="text-indigo-500 text-xs font-medium uppercase tracking-wide mb-0.5">Avg. price per unit (with tax)</p>
                  <p className="text-indigo-900 font-bold text-lg">{formatCurrency(perUnitPost)}</p>
                </div>
              )}
              <div className="ml-auto self-end text-xs text-indigo-400">{totalQty} units total</div>
            </div>
          )}

          {/* Subtotal / tax / total */}
          <div className="flex flex-col items-end gap-1 text-sm">
            <p className="text-gray-500">Subtotal: <span className="font-medium text-gray-700">{formatCurrency(subtotal)}</span></p>
            {hasTax && (
              <>
                <p className="text-gray-500">GST (5%): <span className="font-medium text-gray-700">{formatCurrency(gstCents)}</span></p>
                <p className="text-gray-500">QST (9.975%): <span className="font-medium text-gray-700">{formatCurrency(qstCents)}</span></p>
                <p className="text-gray-500">Tax total: <span className="font-medium text-gray-700">{formatCurrency(taxCents)}</span></p>
              </>
            )}
            <p className="text-xl font-bold text-gray-900 mt-1">Total: {formatCurrency(total)}</p>
          </div>

          {/* Quebec tax toggle */}
          {isDraft && (
            <div className="flex justify-end">
              {hasTax ? (
                <button onClick={() => setTaxRate(0)} disabled={savingTax} className="text-xs text-red-500 hover:underline disabled:opacity-50">
                  Remove Quebec tax
                </button>
              ) : (
                <button onClick={() => setTaxRate(QC_RATE)} disabled={savingTax} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                  {savingTax ? 'Saving…' : '+ Apply Quebec Tax (GST + QST, 14.975%)'}
                </button>
              )}
            </div>
          )}

          {quote.valid_until && (
            <p className="text-right text-xs text-gray-400">Valid until {formatDate(quote.valid_until)}</p>
          )}
        </div>
      </Card>

      {/* Cost analysis — admin only, never sent to customer */}
      {hasCostData && (
        <Card className="mb-4" header={
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">Cost analysis</span>
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Internal only</span>
          </div>
        }>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-400 uppercase tracking-wide">
                <th className="pb-2 font-medium">Item</th>
                <th className="pb-2 font-medium text-right">Qty</th>
                <th className="pb-2 font-medium text-right">Cost/unit</th>
                <th className="pb-2 font-medium text-right">Price/unit</th>
                <th className="pb-2 font-medium text-right">Profit/unit</th>
                <th className="pb-2 font-medium text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.filter(i => i.unit_cost_cents != null).map((item: any) => {
                const cost   = item.unit_cost_cents as number
                const price  = item.unit_price_cents as number
                const profit = price - cost
                const margin = price > 0 ? (profit / price) * 100 : 0
                const label  = item.description.split(' — ')[0].replace('Custom ', '')
                const color  = item.description.split(' — ')[1] ?? ''
                return (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2 text-gray-700">
                      <span className="font-medium">{label}</span>
                      {color && <span className="ml-1 text-gray-400 text-xs">— {color}</span>}
                    </td>
                    <td className="py-2 text-right text-gray-500">{item.quantity}</td>
                    <td className="py-2 text-right text-gray-500">{formatCurrency(cost)}</td>
                    <td className="py-2 text-right text-gray-700">{formatCurrency(price)}</td>
                    <td className="py-2 text-right text-green-600 font-medium">{formatCurrency(profit)}</td>
                    <td className="py-2 text-right">
                      <span className={`font-medium ${margin >= 30 ? 'text-green-600' : margin >= 20 ? 'text-yellow-600' : 'text-red-500'}`}>
                        {margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t bg-gray-50">
                <td colSpan={2} className="pt-2 pb-1 text-xs text-gray-400 font-medium">Totals</td>
                <td className="pt-2 pb-1 text-right text-sm text-gray-500">{formatCurrency(totalCost)}</td>
                <td className="pt-2 pb-1 text-right text-sm text-gray-700">{formatCurrency(subtotal)}</td>
                <td className="pt-2 pb-1 text-right text-sm font-bold text-green-600">{formatCurrency(totalProfit)}</td>
                <td className="pt-2 pb-1 text-right text-sm font-bold">
                  <span className={overallMargin >= 30 ? 'text-green-600' : overallMargin >= 20 ? 'text-yellow-600' : 'text-red-500'}>
                    {overallMargin.toFixed(1)}%
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
          </div>
        </Card>
      )}

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

      <div className="flex flex-wrap gap-3">
        {isDraft && (
          <Link href={`/admin/quotes/new?quoteId=${quoteId}`}>
            <Button variant="secondary">Edit quote</Button>
          </Link>
        )}
        {isDraft && (
          <Button onClick={() => sendQuote(false)} loading={sending}>Send to customer</Button>
        )}
        {!isDraft && quote.status !== 'declined' && (
          <Button onClick={() => sendQuote(true)} loading={sending} variant="secondary">Resend quote</Button>
        )}
      </div>

      {quote.status === 'accepted' && (
        <Link href={`/admin/invoices/new?quoteId=${quoteId}`}>
          <Button>Create invoice from this quote</Button>
        </Link>
      )}

      <div className="mt-2">
        <DeleteButton
          apiPath={`/api/quotes/${quoteId}`}
          redirectTo="/admin/quotes"
          label="quote"
          confirmMessage={`Delete quote ${quote.quote_number}?`}
        />
      </div>

      <div className="mt-4">
        <SupplierCartButton
          quoteId={quoteId}
          isShirtOrder={quote.orders?.product_type === 'shirt'}
        />
      </div>
    </div>
  )
}
