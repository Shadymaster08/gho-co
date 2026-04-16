import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  header?: React.ReactNode
}

export function Card({ children, className, header }: CardProps) {
  return (
    <div className={cn('rounded-2xl bg-white border border-[#d2d2d7]', className)}>
      {header && (
        <div className="border-b border-[#d2d2d7] px-6 py-4">
          {header}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}
