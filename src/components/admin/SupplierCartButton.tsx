'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import type { SupplierCartResult } from '@/app/api/agents/supplier-cart/route'

interface Props {
  quoteId: string
  isShirtOrder: boolean
}

export function SupplierCartButton({ quoteId, isShirtOrder }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SupplierCartResult | null>(null)
  const [open, setOpen] = useState(false)

  if (!isShirtOrder) return null

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/agents/supplier-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId }),
      })
      const data: SupplierCartResult = await res.json()
      if (!res.ok || !data.success) {
        toast.error(data.error ?? 'Supplier cart automation failed.')
      }
      setResult(data)
      setOpen(true)
    } catch {
      toast.error('Failed to reach supplier cart agent.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={handleClick} loading={loading} variant="secondary">
        🛒 Order Blanks from Supplier
      </Button>

      {open && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-gray-900">Supplier Cart</h2>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  result.validation.overall === 'pass'
                    ? 'bg-green-100 text-green-700'
                    : result.success
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {result.success
                    ? result.validation.overall === 'pass' ? '✓ PASS' : '⚠ REVIEW'
                    : '✗ FAILED'}
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Error state */}
            {!result.success && result.error && (
              <div className="mx-6 mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {result.error}
              </div>
            )}

            {/* Validation table */}
            <div className="overflow-y-auto px-6 py-4 flex-1">
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide font-medium">Order manifest</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-gray-400">
                    <th className="pb-2 font-medium">Style</th>
                    <th className="pb-2 font-medium">Colour</th>
                    <th className="pb-2 font-medium">Size</th>
                    <th className="pb-2 font-medium text-right">Expected</th>
                    <th className="pb-2 font-medium text-right">In Cart</th>
                    <th className="pb-2 font-medium text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {result.validation.items.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 text-gray-600 capitalize">{item.style}</td>
                      <td className="py-2 text-gray-700">{item.color}</td>
                      <td className="py-2 text-gray-600">{item.size}</td>
                      <td className="py-2 text-right text-gray-700">{item.expectedQty}</td>
                      <td className="py-2 text-right text-gray-500">
                        {item.foundQty ?? '—'}
                      </td>
                      <td className="py-2 text-right">
                        {item.status === 'match' && <span className="text-green-600 text-xs">✓</span>}
                        {item.status === 'wrong_qty' && <span className="text-yellow-600 text-xs">⚠</span>}
                        {item.status === 'missing' && <span className="text-red-500 text-xs">✗</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {result.validation.overall === 'fail' && (
                <p className="mt-3 text-xs text-yellow-700 bg-yellow-50 rounded p-2">
                  Some items didn't match. Review the cart before paying — you may need to adjust quantities manually.
                </p>
              )}
            </div>

            {/* Footer */}
            {result.success && (
              <div className="mx-6 mb-2 rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
                A browser window has opened and navigated to checkout with the cart filled. Log in to Fabrik.ca and enter your payment info to complete the purchase.
              </div>
            )}
            <div className="flex items-center justify-between border-t px-6 py-4 gap-3">
              <button
                onClick={() => setOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
              <Button
                onClick={() => window.open(result.cartUrl, '_blank')}
                variant="secondary"
              >
                Open Cart in This Browser →
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
