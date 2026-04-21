import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { formatDate, productTypeLabel } from '@/lib/utils'

export const metadata = { title: 'Orders — Gho&Co Admin' }

const ALL_STATUSES = ['received', 'in_review', 'quoted', 'approved', 'in_production', 'shipped', 'complete', 'cancelled']
const ALL_TYPES = ['shirt', '3d_print', 'diy', 'lighting']

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; type?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let query = supabase
    .from('orders')
    .select('id, order_number, product_type, status, created_at, profiles(full_name, email)')
    .order('created_at', { ascending: false })

  if (searchParams.status) query = query.eq('status', searchParams.status)
  if (searchParams.type) query = query.eq('product_type', searchParams.type)

  const { data: orders } = await query

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">All Orders</h1>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <FilterLinks param="status" values={ALL_STATUSES} current={searchParams.status} label="Status" />
        <FilterLinks param="type" values={ALL_TYPES} current={searchParams.type} label="Type" />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((order: any) => (
              <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${order.id}`} className="font-medium text-indigo-600 hover:underline">
                    {order.order_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{order.profiles?.full_name ?? order.profiles?.email ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{productTypeLabel(order.product_type)}</td>
                <td className="px-4 py-3 text-gray-400">{formatDate(order.created_at)}</td>
                <td className="px-4 py-3"><Badge status={order.status} /></td>
                <td className="px-4 py-3">
                  <DeleteButton
                    variant="icon"
                    apiPath={`/api/orders/${order.id}`}
                    redirectTo="/admin/orders"
                    label="order"
                    confirmMessage={`Delete order ${order.order_number}? This will also delete all associated quotes, invoices, and files.`}
                  />
                </td>
              </tr>
            ))}
            {!orders?.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No orders found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FilterLinks({ param, values, current, label }: { param: string; values: string[]; current?: string; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-xs font-medium text-gray-400 mr-1">{label}:</span>
      <Link
        href={`/admin/orders?${param}=`}
        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${!current ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
      >
        All
      </Link>
      {values.map(v => (
        <Link
          key={v}
          href={`/admin/orders?${param}=${v}`}
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${current === v ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          {v.replace('_', ' ')}
        </Link>
      ))}
    </div>
  )
}
