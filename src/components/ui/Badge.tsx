import { cn } from '@/lib/utils'
import type { OrderStatus, QuoteStatus, InvoiceStatus } from '@/types'

type Status = OrderStatus | QuoteStatus | InvoiceStatus

const statusConfig: Record<Status, { label: string; className: string }> = {
  // Order statuses
  received:      { label: 'Received',      className: 'bg-blue-100 text-blue-800' },
  in_review:     { label: 'In Review',     className: 'bg-yellow-100 text-yellow-800' },
  quoted:        { label: 'Quoted',        className: 'bg-purple-100 text-purple-800' },
  approved:      { label: 'Approved',      className: 'bg-green-100 text-green-800' },
  in_production: { label: 'In Production', className: 'bg-orange-100 text-orange-800' },
  shipped:       { label: 'Shipped',       className: 'bg-teal-100 text-teal-800' },
  complete:      { label: 'Complete',      className: 'bg-emerald-100 text-emerald-800' },
  cancelled:     { label: 'Cancelled',     className: 'bg-red-100 text-red-800' },
  // Quote statuses
  draft:         { label: 'Draft',         className: 'bg-gray-100 text-gray-700' },
  sent:          { label: 'Sent',          className: 'bg-blue-100 text-blue-800' },
  accepted:      { label: 'Accepted',      className: 'bg-green-100 text-green-800' },
  declined:      { label: 'Declined',      className: 'bg-red-100 text-red-800' },
  expired:       { label: 'Expired',       className: 'bg-yellow-100 text-yellow-800' },
  // Invoice statuses
  paid:          { label: 'Paid',          className: 'bg-emerald-100 text-emerald-800' },
  voided:        { label: 'Voided',        className: 'bg-gray-100 text-gray-500 line-through' },
}

interface BadgeProps {
  status: Status
  className?: string
}

export function Badge({ status, className }: BadgeProps) {
  const config = statusConfig[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', config.className, className)}>
      {config.label}
    </span>
  )
}
