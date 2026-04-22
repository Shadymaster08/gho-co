'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'

const QC_GST  = 0.05
const QC_QST  = 0.09975
const QC_RATE = QC_GST + QC_QST

function NewInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const quoteId = searchParams.get('quoteId') ?? ''

  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(!!quoteId)
  const [saving, setSaving] = useState(false)

  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentInstructions, setPaymentInstructions] = useState(
    'Virement interac / E-transfer : ghoetco@gmail.com\nVeuillez inclure votre numéro de commande dans le message.\n\nPlease include your order number in the message.'
  )

  useEffect(() => {
    if (!quoteId) return
    fetch(`/api/quotes/${quoteId}`)
      .then(r => r.ok ? r.json() : null)
      .then(q => { setQuote(q); setLoading(false) })
  }, [quoteId])

  async function handleCreate(sendNow: boolean) {
    if (!quoteId && !quote) { toast.error('No quote selected.'); return }
    setSaving(true)

    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: quote?.order_id,
        quote_id: quoteId || undefined,
        due_date: dueDate || null,
        notes: notes || null,
        payment_instructions: paymentInstructions || null,
      }),
    })

    if (!res.ok) {
      toast.error('Failed to create invoice.')
      setSaving(false)
      return
    }

    const invoice = await res.json()

    if (sendNow) {
      const sendRes = await fetch(`/api/invoices/${invoice.id}/send`, { method: 'POST' })
      if (!sendRes.ok) toast.error('Invoice created but email failed to send.')
      else toast.success('Invoice sent to customer!')
    } else {
      toast.success('Invoice created as draft.')
    }

    router.push(`/admin/invoices/${invoice.id}`)
  }

  if (loading) return <div className="p-10 text-center text-gray-400">Loading quote...</div>
  if (quoteId && !quote) return <div className="p-10 text-center text-gray-400">Quote not found.</div>

  const lineItems = quote?.line_items ?? []
  const subtotal  = quote?.subtotal_cents ?? 0
  const taxCents  = quote?.tax_cents ?? 0
  const total     = quote?.total_cents ?? 0
  const hasTax    = taxCents > 0

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <Link href="/admin/invoices" className="text-sm text-indigo-600 hover:underline">← Invoices</Link>
      <div className="mt-2 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
        {quote && (
          <p className="mt-1 text-sm text-gray-500">
            From quote <Link href={`/admin/quotes/${quoteId}`} className="text-indigo-600 hover:underline">{quote.quote_number}</Link>
            {' '}&middot; {quote.orders?.profiles?.full_name ?? quote.orders?.profiles?.email}
          </p>
        )}
      </div>

      {/* Line items (read-only, from quote) */}
      <Card className="mb-6" header={<span className="font-semibold text-gray-900">Line items</span>}>
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

        <div className="mt-4 border-t pt-4 flex flex-col items-end gap-1 text-sm">
          <p className="text-gray-500">Subtotal: <span className="font-medium text-gray-700">{formatCurrency(subtotal)}</span></p>
          {hasTax && (
            <>
              <p className="text-gray-500">GST (5%): <span className="font-medium text-gray-700">{formatCurrency(Math.round(subtotal * QC_GST))}</span></p>
              <p className="text-gray-500">QST (9.975%): <span className="font-medium text-gray-700">{formatCurrency(Math.round(subtotal * QC_QST))}</span></p>
            </>
          )}
          <p className="text-xl font-bold text-gray-900 mt-1">Total: {formatCurrency(total)}</p>
        </div>
      </Card>

      {/* Invoice settings */}
      <Card header={<span className="font-semibold text-gray-900">Invoice details</span>} className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Due date (optional)"
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />
          <div />
          <div className="sm:col-span-2">
            <Textarea
              label="Payment instructions (visible to customer)"
              value={paymentInstructions}
              onChange={e => setPaymentInstructions(e.target.value)}
              rows={3}
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="Notes for customer (optional)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button onClick={() => handleCreate(false)} variant="secondary" loading={saving}>
          Save as draft
        </Button>
        <Button onClick={() => handleCreate(true)} loading={saving}>
          Create &amp; send to customer
        </Button>
      </div>
    </div>
  )
}

export default function NewInvoicePageWrapper() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-400">Loading...</div>}>
      <NewInvoicePage />
    </Suspense>
  )
}
