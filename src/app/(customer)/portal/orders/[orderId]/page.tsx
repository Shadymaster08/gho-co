import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { OrderStatusTimeline } from '@/components/orders/OrderStatusTimeline'
import { formatDate, formatCurrency, productTypeLabel } from '@/lib/utils'
import Link from 'next/link'
import { FileText, Receipt } from 'lucide-react'
import { ShirtMockupCard } from '@/components/orders/ShirtMockup'

export default async function PortalOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: order } = await supabase
    .from('orders')
    .select('*, order_files(*), quotes(*), invoices(*)')
    .eq('id', orderId)
    .eq('customer_id', user.id)
    .single()

  if (!order) notFound()

  const latestQuote = order.quotes?.find((q: any) => q.status === 'sent' || q.status === 'accepted')
  const latestInvoice = order.invoices?.find((i: any) => i.status === 'sent' || i.status === 'paid')

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link href="/portal" className="text-sm text-indigo-600 hover:underline">← My orders</Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{order.order_number}</h1>
          <p className="text-sm text-gray-400">{productTypeLabel(order.product_type)} &middot; Placed {formatDate(order.created_at)}</p>
        </div>
        <Badge status={order.status} className="text-sm" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Quote */}
          {latestQuote && (
            <Card header={<div className="flex items-center gap-2 font-semibold text-gray-900"><FileText className="h-4 w-4" /> Quote {latestQuote.quote_number}</div>}>
              <div className="flex items-center justify-between">
                <div>
                  <Badge status={latestQuote.status} />
                  <p className="mt-1 text-sm text-gray-500">Total: {formatCurrency(latestQuote.total_cents)}</p>
                  {latestQuote.valid_until && <p className="text-xs text-gray-400">Valid until {formatDate(latestQuote.valid_until)}</p>}
                </div>
                <Link
                  href={`/portal/quotes/${latestQuote.id}`}
                  className="text-sm font-medium text-indigo-600 hover:underline"
                >
                  View quote →
                </Link>
              </div>
            </Card>
          )}

          {/* Invoice */}
          {latestInvoice && (
            <Card header={<div className="flex items-center gap-2 font-semibold text-gray-900"><Receipt className="h-4 w-4" /> Invoice {latestInvoice.invoice_number}</div>}>
              <div className="flex items-center justify-between">
                <div>
                  <Badge status={latestInvoice.status} />
                  <p className="mt-1 text-sm text-gray-500">Total: {formatCurrency(latestInvoice.total_cents)}</p>
                  {latestInvoice.due_date && <p className="text-xs text-gray-400">Due {formatDate(latestInvoice.due_date)}</p>}
                </div>
                <Link
                  href={`/portal/invoices/${latestInvoice.id}`}
                  className="text-sm font-medium text-indigo-600 hover:underline"
                >
                  View invoice →
                </Link>
              </div>
            </Card>
          )}

          {/* Files */}
          {order.order_files?.length > 0 && (
            <Card header={<span className="font-semibold text-gray-900">Uploaded files</span>}>
              <ul className="flex flex-col gap-2">
                {order.order_files.map((f: any) => (
                  <li key={f.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{f.file_name}</span>
                    <span className="text-xs text-gray-400 capitalize">{f.file_type.replace('_', ' ')}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Notes */}
          {order.customer_notes && (
            <Card header={<span className="font-semibold text-gray-900">Your notes</span>}>
              <p className="text-sm text-gray-600">{order.customer_notes}</p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          {order.product_type === 'shirt' && order.configuration && (
            <Card header={<span className="font-semibold text-gray-900">Your design</span>}>
              <ShirtMockupCard
                config={order.configuration}
                orderFiles={order.order_files ?? []}
                orderId={order.id}
              />
            </Card>
          )}

          <Card header={<span className="font-semibold text-gray-900">Order status</span>}>
            <OrderStatusTimeline currentStatus={order.status} updatedAt={order.updated_at} />
          </Card>
        </div>
      </div>
    </div>
  )
}
