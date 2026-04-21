import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { productTypeLabel } from '@/lib/utils'
import { redirect } from 'next/navigation'

export default async function OrderConfirmationPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: order } = await supabase
    .from('orders')
    .select('order_number, product_type, created_at')
    .eq('id', orderId)
    .eq('customer_id', user.id)
    .single()

  if (!order) redirect('/portal')

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
        <h1 className="text-2xl font-bold text-gray-900">Order submitted!</h1>
        <p className="mt-2 text-gray-500">
          Your order <strong>{order.order_number}</strong> ({productTypeLabel(order.product_type)}) has been received.
          We will review it and send you a quote by email.
        </p>

        <div className="mt-8 flex justify-center gap-3">
          <Link href="/portal">
            <Button variant="secondary">View all orders</Button>
          </Link>
          <Link href="/">
            <Button>Place another order</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
