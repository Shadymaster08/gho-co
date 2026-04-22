import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

export const metadata = { title: 'Invoices — Gho&Co Admin' }

export default async function AdminInvoicesPage({ searchParams }: { searchParams: { createFrom?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, orders(order_number, profiles(email, full_name))')
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        {searchParams.createFrom && (
          <form action="/api/invoices" method="POST">
            <input type="hidden" name="quote_id" value={searchParams.createFrom} />
            <Link href={`/admin/invoices/new?quoteId=${searchParams.createFrom}`}>
              <Button size="sm">Create invoice from quote</Button>
            </Link>
          </form>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices?.map((inv: any) => (
              <tr key={inv.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/invoices/${inv.id}`} className="font-medium text-indigo-600 hover:underline">
                    {inv.invoice_number}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${inv.order_id}`} className="text-indigo-600 hover:underline">
                    {inv.orders?.order_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{inv.orders?.profiles?.full_name ?? inv.orders?.profiles?.email ?? '—'}</td>
                <td className="px-4 py-3 font-medium">{formatCurrency(inv.total_cents)}</td>
                <td className="px-4 py-3 text-gray-400">{formatDate(inv.created_at)}</td>
                <td className="px-4 py-3"><Badge status={inv.status} /></td>
              </tr>
            ))}
            {!invoices?.length && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No invoices yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
