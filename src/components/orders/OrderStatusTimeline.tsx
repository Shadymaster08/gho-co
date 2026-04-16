import { Check } from 'lucide-react'
import type { OrderStatus } from '@/types'
import { formatDateTime } from '@/lib/utils'

const STATUS_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'received',      label: 'Order received' },
  { status: 'in_review',     label: 'Under review' },
  { status: 'quoted',        label: 'Quote sent' },
  { status: 'approved',      label: 'Quote approved' },
  { status: 'in_production', label: 'In production' },
  { status: 'shipped',       label: 'Shipped' },
  { status: 'complete',      label: 'Complete' },
]

const STATUS_ORDER = STATUS_STEPS.map(s => s.status)

interface OrderStatusTimelineProps {
  currentStatus: OrderStatus
  updatedAt?: string
}

export function OrderStatusTimeline({ currentStatus, updatedAt }: OrderStatusTimelineProps) {
  if (currentStatus === 'cancelled') {
    return (
      <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        This order has been cancelled.
      </div>
    )
  }

  const currentIndex = STATUS_ORDER.indexOf(currentStatus)

  return (
    <ol className="relative ml-3 border-l border-gray-200">
      {STATUS_STEPS.map(({ status, label }, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        return (
          <li key={status} className="mb-6 ml-6 last:mb-0">
            <span className={`absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full border-2 ${
              done ? 'border-indigo-600 bg-indigo-600' : active ? 'border-indigo-600 bg-white' : 'border-gray-300 bg-white'
            }`}>
              {done ? (
                <Check className="h-3.5 w-3.5 text-white" />
              ) : (
                <span className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-indigo-600' : 'bg-gray-300'}`} />
              )}
            </span>
            <p className={`text-sm font-medium ${active ? 'text-indigo-700' : done ? 'text-gray-900' : 'text-gray-400'}`}>
              {label}
            </p>
            {active && updatedAt && (
              <time className="text-xs text-gray-400">{formatDateTime(updatedAt)}</time>
            )}
          </li>
        )
      })}
    </ol>
  )
}
