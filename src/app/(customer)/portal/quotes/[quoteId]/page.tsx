'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Quote } from '@/types'

export default function CustomerQuotePage() {
  const router = useRouter()
  const { quoteId } = useParams<{ quoteId: string }>()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  useEffect(() => {
    if (!quoteId) return
    const supabase = createClient()
    supabase.from('quotes').select('*').eq('id', quoteId).single()
      .then(({ data }) => { setQuote(data); setLoading(false) })
  }, [quoteId])

  async function respond(action: 'accepted' | 'declined', reason?: string) {
    setActing(true)
    const body: Record<string, string> = { status: action }
    if (reason?.trim()) body.decline_reason = reason.trim()

    const res = await fetch(`/api/quotes/${quoteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      toast.error('Failed to update quote.')
      setActing(false)
      return
    }

    toast.success(action === 'accepted' ? 'Quote accepted! We will get started soon.' : 'Quote declined.')
    router.push('/portal')
  }

  if (loading) return <div className="p-10 text-center text-sm text-gray-400">Loading...</div>
  if (!quote) return <div className="p-10 text-center text-sm text-gray-400">Quote not found.</div>

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quote {quote.quote_number}</h1>
          {quote.valid_until && <p className="text-xs text-gray-400">Valid until {formatDate(quote.valid_until)}</p>}
        </div>
        <Badge status={quote.status} />
      </div>

      <Card className="mb-6">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 font-medium text-right">Qty</th>
              <th className="pb-2 font-medium text-right">Unit</th>
              <th className="pb-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {(quote.line_items ?? []).map((item: any) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="py-2 text-gray-700">{item.description}</td>
                <td className="py-2 text-right text-gray-500">{item.quantity}</td>
                <td className="py-2 text-right text-gray-500">{formatCurrency(item.unit_price_cents)}</td>
                <td className="py-2 text-right font-medium">{formatCurrency(item.total_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <div className="mt-4 flex flex-col items-end gap-1 text-sm">
          <p className="text-gray-500">Subtotal: {formatCurrency(quote.subtotal_cents)}</p>
          {quote.tax_cents > 0 && <p className="text-gray-500">Tax ({(quote.tax_rate * 100).toFixed(1)}%): {formatCurrency(quote.tax_cents)}</p>}
          <p className="text-lg font-bold text-gray-900">Total: {formatCurrency(quote.total_cents)}</p>
        </div>

        {quote.notes && (
          <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            <p className="mb-1 font-medium text-gray-700">Notes from our team</p>
            <p>{quote.notes}</p>
          </div>
        )}
      </Card>

      {quote.status === 'sent' && (
        <>
          {declining ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-col gap-3">
              <p className="text-sm font-medium text-gray-700">Why are you declining this quote? <span className="text-gray-400 font-normal">(optional)</span></p>
              <textarea
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                rows={3}
                placeholder="e.g. price too high, changed my mind..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <div className="flex gap-2">
                <Button variant="danger" onClick={() => respond('declined', declineReason)} loading={acting} className="flex-1">
                  Confirm decline
                </Button>
                <Button variant="secondary" onClick={() => { setDeclining(false); setDeclineReason('') }} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button onClick={() => respond('accepted')} loading={acting} className="flex-1">
                Accept quote
              </Button>
              <Button variant="danger" onClick={() => setDeclining(true)} className="flex-1">
                Decline
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
