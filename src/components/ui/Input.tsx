import { cn } from '@/lib/utils'
import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helper?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helper, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[#1d1d1f]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'rounded-xl border px-4 py-2.5 text-sm text-[#1d1d1f] placeholder-[#86868b] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent',
            error
              ? 'border-red-400 bg-red-50'
              : 'border-[#d2d2d7] bg-white hover:border-[#6e6e73]',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        {helper && !error && <p className="text-xs text-[#86868b]">{helper}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
