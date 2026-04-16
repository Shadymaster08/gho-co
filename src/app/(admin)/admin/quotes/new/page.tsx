'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { Trash2, Plus } from 'lucide-react'
import type { LineItem } from '@/types'
import { PricingCalculator } from '@/components/admin/PricingCalculator'

function NewQuotePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId') ?? ''

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: uuidv4(), description: '', quantity: 1, unit_price_cents: 0, total_cents: 0 },
  ])
  const [taxRate, setTaxRate] = useState('0')
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [materialCostCents, setMaterialCostCents] = useState(0)
  const [loading, setLoading] = useState(false)
  const [orderInfo, setOrderInfo] = useState<any>(null)

  useEffect(() => {
    if (!orderId) return
    fetch(`/api/orders/${orderId}`).then(r => r.json()).then(setOrderInfo)
  }, [orderId])

  function applyCalcResult(result: { materialCostCents: number; suggestedPriceCents: number; description: string }) {
    setMaterialCostCents(result.materialCostCents)
    setLineItems([{
      id: uuidv4(),
      description: result.description,
      quantity: 1,
      unit_price_cents: result.suggestedPriceCents,
      total_cents: result.suggestedPriceCents,
    }])
  }

  function updateItem(id: string, field: keyof LineItem, rawValue: string | number) {
    setLineItems(items =>
      items.map(item => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: rawValue }
        updated.total_cents = Math.round(updated.quantity * updated.unit_price_cents)
        return updated
      })
    )
  }

  function addItem() {
    setLineItems(items => [...items, { id: uuidv4(), description: '', quantity: 1, unit_price_cents: 0, total_cents: 0 }])
  }

  function removeItem(id: string) {
    setLineItems(items => items.filter(i => i.id !== id))
  }

  const subtotal = lineItems.reduce((sum, i) => sum + i.total_cents, 0)
  const rate = parseFloat(taxRate) / 100 || 0
  const tax = Math.round(subtotal * rate)
  const total = subtotal + tax

  async function handleSave(send: boolean) {
    if (!orderId) { toast.error('No order selected'); return }
    setLoading(true)

    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId,
        line_items: lineItems,
        tax_rate: rate,
        valid_until: validUntil || null,
        notes: notes || null,
        internal_notes: internalNotes || null,
        material_cost_cents: materialCostCents,
      }),
    })

    if (!res.ok) {
      toast.error('Failed to create quote.')
      setLoading(false)
      return
    }

    const quote = await res.json()

    if (send) {
      const sendRes = await fetch(`/api/quotes/${quote.id}/send`, { method: 'POST' })
      if (!sendRes.ok) {
        toast.error('Quote saved but email failed to send.')
      } else {
        toast.success('Quote sent to customer!')
      }
    } else {
      toast.success('Quote saved as draft.')
    }

    router.push(`/admin/quotes/${quote.id}`)
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Quote</h1>
        {orderInfo && (
          <p className="mt-1 text-sm text-gray-500">
            For order <strong>{orderInfo.order_number}</strong> &middot; {orderInfo.profiles?.full_name ?? orderInfo.profiles?.email}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-6 max-w-3xl">
        <PricingCalculator
          productType={orderInfo?.product_type ?? null}
          onApply={applyCalcResult}
        />

        {materialCostCents > 0 && (
          <div className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">
            Material cost recorded: <strong>{formatCurrency(materialCostCents)}</strong> — margin will be tracked automatically.
          </div>
        )}

        <Card header={<span className="font-semibold text-gray-900">Line items</span>}>
          <div className="flex flex-col gap-3">
            {lineItems.map((item, idx) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-5">
                  <input
                    placeholder="Description"
                    value={item.description}
                    onChange={e => updateItem(item.id, 'description', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number" min={1} placeholder="Qty"
                    value={item.quantity}
                    onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number" min={0} placeholder="Unit $"
                    value={item.unit_price_cents / 100}
                    onChange={e => updateItem(item.id, 'unit_price_cents', Math.round(parseFloat(e.target.value) * 100) || 0)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="col-span-2 flex items-center pt-2 text-sm font-medium text-gray-700">
                  {formatCurrency(item.total_cents)}
                </div>
                <div className="col-span-1 flex items-center pt-1">
                  <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            <button onClick={addItem} className="flex items-center gap-1 text-sm text-indigo-600 hover:underline mt-1">
              <Plus className="h-4 w-4" /> Add line item
            </button>
          </div>

          <div className="mt-6 flex flex-col items-end gap-1 border-t pt-4 text-sm">
            <p>Subtotal: <strong>{formatCurrency(subtotal)}</strong></p>
            <div className="flex items-center gap-2">
              <span>Tax rate:</span>
              <input
                type="number" min={0} max={100} step={0.1}
                value={taxRate}
                onChange={e => setTaxRate(e.target.value)}
                className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span>%</span>
              <span className="text-gray-500">{formatCurrency(tax)}</span>
            </div>
            <p className="text-base font-bold">Total: {formatCurrency(total)}</p>
          </div>
        </Card>

        <Card header={<span className="font-semibold text-gray-900">Settings</span>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Valid until (optional)"
              type="date"
              value={validUntil}
              onChange={e => setValidUntil(e.target.value)}
            />
            <div />
            <div className="sm:col-span-2">
              <Textarea
                label="Notes for customer (visible)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="sm:col-span-2">
              <Textarea
                label="Internal notes (not sent to customer)"
                value={internalNotes}
                onChange={e => setInternalNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button onClick={() => handleSave(false)} variant="secondary" loading={loading}>Save as draft</Button>
          <Button onClick={() => handleSave(true)} loading={loading}>Save &amp; send to customer</Button>
        </div>
      </div>
    </div>
  )
}

export default function NewQuotePageWrapper() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-400">Loading...</div>}>
      <NewQuotePage />
    </Suspense>
  )
}
