import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { formatDate, formatCurrency, productTypeLabel } from '@/lib/utils'

export const metadata = { title: 'Quotes — Gho&Co Admin' }

export default async function AdminQuotesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: quotes } = await supabase
    .from('quotes')
    .select('*, orders(order_number, product_type, profiles(email, full_name))')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Quotes</h1>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Quote</th>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {quotes?.map((q: any) => (
              <tr key={q.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/quotes/${q.id}`} className="font-medium text-indigo-600 hover:underline">
                    {q.quote_number}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${q.order_id}`} className="text-indigo-600 hover:underline">
                    {q.orders?.order_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{q.orders?.profiles?.full_name ?? q.orders?.profiles?.email ?? '—'}</td>
                <td className="px-4 py-3 font-medium">{formatCurrency(q.total_cents)}</td>
                <td className="px-4 py-3 text-gray-400">{formatDate(q.created_at)}</td>
                <td className="px-4 py-3"><Badge status={q.status} /></td>
                <td className="px-4 py-3">
                  <DeleteButton
                    variant="icon"
                    apiPath={`/api/quotes/${q.id}`}
                    redirectTo="/admin/quotes"
                    label="quote"
                    confirmMessage={`Delete quote ${q.quote_number}?`}
                  />
                </td>
              </tr>
            ))}
            {!quotes?.length && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No quotes yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
