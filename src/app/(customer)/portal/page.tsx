import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate, productTypeLabel } from '@/lib/utils'
import { Package } from 'lucide-react'

export const metadata = { title: 'My Orders — Gho&Co' }

export default async function PortalPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, product_type, status, created_at, updated_at')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        <Link href="/"><Button size="sm">New order</Button></Link>
      </div>

      {!orders?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
          <Package className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-gray-500">No orders yet</p>
          <Link href="/" className="mt-4">
            <Button size="sm">Place your first order</Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map(order => (
            <Link
              key={order.id}
              href={`/portal/orders/${order.id}`}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">{order.order_number}</p>
                <p className="text-xs text-gray-400">{productTypeLabel(order.product_type)} &middot; {formatDate(order.created_at)}</p>
              </div>
              <Badge status={order.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
