import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { FollowUpFlags } from '@/components/admin/FollowUpFlags'
import { ProfitEstimator } from '@/components/admin/ProfitEstimator'
import { DailyDigestPanel } from '@/components/admin/DailyDigestPanel'
import { formatDate, formatCurrency, productTypeLabel } from '@/lib/utils'

export const metadata = { title: 'Dashboard — Gho&Co Admin' }

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().slice(0, 10)

  const [
    { count: newToday },
    { count: pendingQuotes },
    { count: inProduction },
    { count: unpaidInvoices },
    { data: recentOrders },
  ] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00`),
    supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'in_production'),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    supabase.from('orders')
      .select('id, order_number, product_type, status, created_at, profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const stats = [
    { label: 'New orders today', value: newToday ?? 0, color: 'text-indigo-600' },
    { label: 'Quotes pending', value: pendingQuotes ?? 0, color: 'text-yellow-600' },
    { label: 'In production', value: inProduction ?? 0, color: 'text-orange-600' },
    { label: 'Invoices outstanding', value: unpaidInvoices ?? 0, color: 'text-red-600' },
  ]

  return (
    <div className="p-4 sm:p-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, color }) => (
          <Card key={label}>
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Business overview */}
      <div className="mb-8">
        <DailyDigestPanel />
      </div>

      {/* Follow-up flags */}
      <div className="mb-8">
        <FollowUpFlags />
      </div>

      {/* Profit Estimator */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Profit & Margin</h2>
        <ProfitEstimator />
      </div>

      {/* Recent Orders */}
      <Card header={<span className="font-semibold text-gray-900">Recent orders</span>}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 font-medium">Order</th>
              <th className="pb-2 font-medium">Customer</th>
              <th className="pb-2 font-medium">Product</th>
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders?.map((order: any) => (
              <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-2">
                  <Link href={`/admin/orders/${order.id}`} className="font-medium text-indigo-600 hover:underline">
                    {order.order_number}
                  </Link>
                </td>
                <td className="py-2 text-gray-600">{order.profiles?.full_name ?? order.profiles?.email ?? '—'}</td>
                <td className="py-2 text-gray-600">{productTypeLabel(order.product_type)}</td>
                <td className="py-2 text-gray-400">{formatDate(order.created_at)}</td>
                <td className="py-2"><Badge status={order.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
