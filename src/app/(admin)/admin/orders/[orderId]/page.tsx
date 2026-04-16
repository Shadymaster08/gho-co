'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { OrderStatusTimeline } from '@/components/orders/OrderStatusTimeline'
import { formatDate, formatDateTime, productTypeLabel } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Order, OrderStatus } from '@/types'
import { normalizeShirtConfig } from '@/lib/pricing'

function ShirtConfigDisplay({ config }: { config: any }) {
  const { color_groups } = normalizeShirtConfig(config)
  const style = config.shirt_style ?? 'tshirt'
  const styleName = style.charAt(0).toUpperCase() + style.slice(1)
  const totalQty = color_groups.flatMap((g: any) => g.sizes).reduce((s: number, sz: any) => s + (sz.quantity ?? 0), 0)

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex gap-6">
        <div><span className="text-gray-500">Style</span><p className="font-medium text-gray-900 mt-0.5">{styleName}</p></div>
        <div><span className="text-gray-500">Total qty</span><p className="font-medium text-gray-900 mt-0.5">{totalQty}</p></div>
        {config.dtf_front_width && <div><span className="text-gray-500">Front DTF</span><p className="font-medium text-gray-900 mt-0.5">{config.dtf_front_width}″ × {config.dtf_front_height}″</p></div>}
        {config.dtf_back_width && <div><span className="text-gray-500">Back DTF</span><p className="font-medium text-gray-900 mt-0.5">{config.dtf_back_width}″ × {config.dtf_back_height}″</p></div>}
      </div>

      <div>
        <p className="text-gray-500 mb-2">Colours &amp; sizes</p>
        <div className="flex flex-col gap-2">
          {color_groups.map((group: any, i: number) => {
            const groupQty = group.sizes.reduce((s: number, sz: any) => s + (sz.quantity ?? 0), 0)
            const activeSizes = group.sizes.filter((sz: any) => sz.quantity > 0)
            return (
              <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <span className="font-medium text-gray-800">{group.color}</span>
                <span className="text-gray-400 ml-2">×{groupQty}</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {activeSizes.map((sz: any) => (
                    <span key={sz.size} className="text-xs text-gray-600 bg-white border border-gray-200 rounded px-1.5 py-0.5">
                      {sz.size}: {sz.quantity}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const ALL_STATUSES: OrderStatus[] = [
  'received', 'in_review', 'quoted', 'approved',
  'in_production', 'shipped', 'complete', 'cancelled',
]

export default function AdminOrderDetailPage({ params }: { params: { orderId: string } }) {
  const router = useRouter()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [status, setStatus] = useState<OrderStatus>('received')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('orders')
      .select('*, profiles(full_name, email), order_files(*), quotes(*), invoices(*)')
      .eq('id', params.orderId)
      .single()
      .then(({ data }) => {
        if (data) {
          setOrder(data)
          setAdminNotes(data.admin_notes ?? '')
          setStatus(data.status)
        }
        setLoading(false)
      })
  }, [params.orderId])

  async function saveChanges() {
    setSaving(true)
    const res = await fetch(`/api/orders/${params.orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, admin_notes: adminNotes }),
    })

    if (!res.ok) {
      toast.error('Failed to save changes.')
    } else {
      const updated = await res.json()
      setOrder((o: any) => ({ ...o, ...updated }))
      toast.success('Order updated.')
    }
    setSaving(false)
  }

  async function generateQuote() {
    setGenerating(true)
    const res = await fetch('/api/agents/quote-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: params.orderId }),
    })
    if (!res.ok) {
      toast.error('Failed to generate quote.')
      setGenerating(false)
      return
    }
    const { quote_id, notes } = await res.json()
    if (notes) toast.info(notes)
    toast.success('Draft quote created — review before sending.')
    router.push(`/admin/quotes/${quote_id}`)
  }

  if (loading) return <div className="p-10 text-center text-gray-400">Loading...</div>
  if (!order) return <div className="p-10 text-center text-gray-400">Order not found.</div>

  const config = order.configuration ?? {}

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link href="/admin/orders" className="text-sm text-indigo-600 hover:underline">← Orders</Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{order.order_number}</h1>
          <p className="text-sm text-gray-400">
            {productTypeLabel(order.product_type)} &middot; {order.profiles?.full_name ?? order.profiles?.email} &middot; {formatDate(order.created_at)}
          </p>
        </div>
        <Badge status={order.status} className="text-sm" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Order configuration */}
          <Card header={<span className="font-semibold text-gray-900">Order details</span>}>
            {order.product_type === 'shirt' ? (
              <ShirtConfigDisplay config={config} />
            ) : (
              <pre className="overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-700">
                {JSON.stringify(config, null, 2)}
              </pre>
            )}
            {order.customer_notes && (
              <div className="mt-3 rounded bg-yellow-50 p-3 text-sm text-yellow-800">
                <strong>Customer note:</strong> {order.customer_notes}
              </div>
            )}
          </Card>

          {/* Files */}
          {order.order_files?.length > 0 && (
            <Card header={<span className="font-semibold text-gray-900">Files</span>}>
              <ul className="flex flex-col gap-2">
                {order.order_files.map((f: any) => (
                  <li key={f.id} className="flex items-center justify-between text-sm">
                    <a
                      href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/order-files/${f.storage_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      {f.file_name}
                    </a>
                    <span className="text-xs text-gray-400 capitalize">{f.file_type.replace('_', ' ')}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Admin controls */}
          <Card header={<span className="font-semibold text-gray-900">Update order</span>}>
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as OrderStatus)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {ALL_STATUSES.map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Admin notes (internal only)</label>
                <textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={saveChanges} loading={saving}>Save changes</Button>
                <Button onClick={generateQuote} loading={generating} variant="secondary">
                  ⚡ Auto-generate quote
                </Button>
                <Link href={`/admin/quotes/new?orderId=${order.id}`}>
                  <Button variant="ghost">Manual quote</Button>
                </Link>
                <DeleteButton
                  apiPath={`/api/orders/${order.id}`}
                  redirectTo="/admin/orders"
                  label="order"
                  confirmMessage={`Delete order ${order.order_number}? This will also delete all associated quotes, invoices, and files.`}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <Card header={<span className="font-semibold text-gray-900">Status timeline</span>}>
            <OrderStatusTimeline currentStatus={order.status} updatedAt={order.updated_at} />
          </Card>

          {order.quotes?.length > 0 && (
            <Card header={<span className="font-semibold text-gray-900">Quotes</span>}>
              {order.quotes.map((q: any) => (
                <div key={q.id} className="flex items-center justify-between py-1">
                  <Link href={`/admin/quotes/${q.id}`} className="text-sm text-indigo-600 hover:underline">{q.quote_number}</Link>
                  <Badge status={q.status} />
                </div>
              ))}
            </Card>
          )}

          {order.invoices?.length > 0 && (
            <Card header={<span className="font-semibold text-gray-900">Invoices</span>}>
              {order.invoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between py-1">
                  <Link href={`/admin/invoices/${inv.id}`} className="text-sm text-indigo-600 hover:underline">{inv.invoice_number}</Link>
                  <Badge status={inv.status} />
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
