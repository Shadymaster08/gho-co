import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils'

export default async function CustomerInvoicePage({ params }: { params: { invoiceId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, orders!inner(customer_id)')
    .eq('id', params.invoiceId)
    .single()

  if (!invoice || (invoice as any).orders?.customer_id !== user.id) notFound()

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Invoice {invoice.invoice_number}</h1>
          {invoice.due_date && <p className="text-xs text-gray-400">Due {formatDate(invoice.due_date)}</p>}
        </div>
        <Badge status={invoice.status} />
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

        <div className="mt-4 flex flex-col items-end gap-1 text-sm">
          <p className="text-gray-500">Subtotal: {formatCurrency(invoice.subtotal_cents)}</p>
          {invoice.tax_cents > 0 && (
            <p className="text-gray-500">Tax ({(invoice.tax_rate * 100).toFixed(1)}%): {formatCurrency(invoice.tax_cents)}</p>
          )}
          <p className="text-lg font-bold text-gray-900">Total: {formatCurrency(invoice.total_cents)}</p>
        </div>
      </Card>

      {invoice.payment_instructions && invoice.status === 'sent' && (
        <Card header={<span className="font-semibold text-gray-900">How to pay</span>}>
          <p className="whitespace-pre-line text-sm text-gray-700">{invoice.payment_instructions}</p>
        </Card>
      )}

      {invoice.notes && (
        <Card className="mt-4">
          <p className="text-sm text-gray-600">{invoice.notes}</p>
        </Card>
      )}
    </div>
  )
}
