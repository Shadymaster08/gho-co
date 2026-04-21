'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useParams } from 'next/navigation'
import { DeleteButton } from '@/components/admin/DeleteButton'

export default function AdminInvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>()
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    fetch(`/api/invoices/${invoiceId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { setInvoice(data); setLoading(false) })
  }, [invoiceId])

  async function sendInvoice() {
    setActing(true)
    const res = await fetch(`/api/invoices/${invoiceId}/send`, { method: 'POST' })
    if (!res.ok) toast.error('Failed to send invoice.')
    else { toast.success('Invoice sent!'); setInvoice((i: any) => ({ ...i, status: 'sent' })) }
    setActing(false)
  }

  async function markPaid() {
    setActing(true)
    const res = await fetch(`/api/invoices/${invoiceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' }),
    })
    if (!res.ok) toast.error('Failed to mark as paid.')
    else { toast.success('Invoice marked as paid.'); setInvoice((i: any) => ({ ...i, status: 'paid' })) }
    setActing(false)
  }

  if (loading) return <div className="p-10 text-center text-gray-400">Loading...</div>
  if (!invoice) return <div className="p-10 text-center text-gray-400">Invoice not found.</div>

  const customer = invoice.orders?.profiles

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/admin/invoices" className="text-sm text-indigo-600 hover:underline">← Invoices</Link>
      <div className="mt-2 mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
          <p className="text-sm text-gray-400">
            Order <Link href={`/admin/orders/${invoice.order_id}`} className="text-indigo-600 hover:underline">{invoice.orders?.order_number}</Link>
            {' '}&middot; {customer?.full_name ?? customer?.email}
          </p>
        </div>
        <Badge status={invoice.status} className="text-sm" />
      </div>

      <Card className="mb-6 no-print" header={
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-900">Invoice</span>
          <button onClick={() => window.print()} className="text-sm text-indigo-600 hover:underline">Print</button>
        </div>
      }>
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
            {(invoice.line_items ?? []).map((item: any) => (
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
          <p className="text-gray-500">Subtotal: {formatCurrency(invoice.subtotal_cents)}</p>
          {invoice.tax_cents > 0 && <p className="text-gray-500">Tax: {formatCurrency(invoice.tax_cents)}</p>}
          <p className="text-lg font-bold">Total: {formatCurrency(invoice.total_cents)}</p>
        </div>

        {invoice.due_date && <p className="mt-3 text-xs text-gray-400">Due: {formatDate(invoice.due_date)}</p>}
        {invoice.paid_at && <p className="text-xs text-green-600">Paid: {formatDate(invoice.paid_at)}</p>}

        {invoice.payment_instructions && (
          <div className="mt-4 rounded bg-gray-50 p-3 text-sm text-gray-700">
            <strong>Payment instructions:</strong>
            <p className="mt-1 whitespace-pre-line">{invoice.payment_instructions}</p>
          </div>
        )}
      </Card>

      <div className="flex gap-3 no-print">
        {invoice.status === 'draft' && (
          <Button onClick={sendInvoice} loading={acting}>Send to customer</Button>
        )}
        {invoice.status === 'sent' && (
          <Button onClick={markPaid} loading={acting} variant="secondary">Mark as paid</Button>
        )}
        <DeleteButton
          apiPath={`/api/invoices/${invoiceId}`}
          redirectTo="/admin/invoices"
          label="Delete invoice"
          confirmMessage="Delete this invoice? This cannot be undone."
          variant="button"
        />
      </div>
    </div>
  )
}
