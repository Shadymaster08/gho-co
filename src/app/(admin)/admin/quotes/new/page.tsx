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
  const quoteId  = searchParams.get('quoteId') ?? ''   // editing existing quote
  const orderId  = searchParams.get('orderId') ?? ''   // creating new quote

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
  const [existingQuote, setExistingQuote] = useState<any>(null)
  const [customers, setCustomers] = useState<Array<{ id: string; email: string; full_name: string | null }>>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')

  // Load existing quote when editing
  useEffect(() => {
    if (!quoteId) return
    fetch(`/api/quotes/${quoteId}`)
      .then(r => r.ok ? r.json() : null)
      .then(q => {
        if (!q) return
        setExistingQuote(q)
        setLineItems(q.line_items?.length
          ? q.line_items
          : [{ id: uuidv4(), description: '', quantity: 1, unit_price_cents: 0, total_cents: 0 }]
        )
        setTaxRate(q.tax_rate ? String(Math.round(q.tax_rate * 100 * 1000) / 1000) : '0')
        setValidUntil(q.valid_until ? q.valid_until.slice(0, 10) : '')
        setNotes(q.notes ?? '')
        setInternalNotes(q.internal_notes ?? '')
        setMaterialCostCents(q.material_cost_cents ?? 0)
        // Load order info from the nested order
        if (q.orders) setOrderInfo(q.orders)
      })
  }, [quoteId])

  // Load order info when creating new quote from an existing order
  useEffect(() => {
    if (!orderId || quoteId) return
    fetch(`/api/orders/${orderId}`).then(r => r.json()).then(setOrderInfo)
  }, [orderId, quoteId])

  // Load customer list when creating a freeform quote (no orderId)
  useEffect(() => {
    if (orderId || quoteId) return
    fetch('/api/admin/customers').then(r => r.json()).then(setCustomers)
  }, [orderId, quoteId])

  function applyCalcResult(result: { materialCostCents: number; suggestedPriceCents: number; description: string }) {
    setMaterialCostCents(result.materialCostCents)

    const currentTotal = lineItems.reduce((s, i) => s + i.total_cents, 0)
    const hasRealItems = lineItems.some(i => i.unit_price_cents > 0)

    if (hasRealItems && currentTotal > 0) {
      // Scale existing line items proportionally to hit the target price
      const ratio = result.suggestedPriceCents / currentTotal
      setLineItems(items => items.map(item => {
        const newUnitPrice = Math.round(item.unit_price_cents * ratio)
        return { ...item, unit_price_cents: newUnitPrice, total_cents: Math.round(item.quantity * newUnitPrice) }
      }))
    } else {
      setLineItems([{
        id: uuidv4(),
        description: result.description,
        quantity: 1,
        unit_price_cents: result.suggestedPriceCents,
        total_cents: result.suggestedPriceCents,
      }])
    }
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

  const resolvedOrderId = orderId || existingQuote?.order_id

  async function handleSave(send: boolean) {
    setLoading(true)

    let finalOrderId = resolvedOrderId

    // Freeform quote: create a stub order for the selected customer first
    if (!finalOrderId) {
      if (!selectedCustomerId) { toast.error('Please select a customer.'); setLoading(false); return }
      const stubRes = await fetch('/api/admin/stub-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: selectedCustomerId }),
      })
      if (!stubRes.ok) { toast.error('Failed to create order for customer.'); setLoading(false); return }
      const stub = await stubRes.json()
      finalOrderId = stub.order_id
    }

    const payload = {
      order_id: finalOrderId,
      line_items: lineItems,
      tax_rate: rate,
      valid_until: validUntil || null,
      notes: notes || null,
      internal_notes: internalNotes || null,
      material_cost_cents: materialCostCents,
    }

    let savedQuoteId: string

    if (quoteId) {
      // Update existing quote
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { toast.error('Failed to update quote.'); setLoading(false); return }
      savedQuoteId = quoteId
    } else {
      // Create new quote
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { toast.error('Failed to create quote.'); setLoading(false); return }
      const quote = await res.json()
      savedQuoteId = quote.id
    }

    if (send) {
      const sendRes = await fetch(`/api/quotes/${savedQuoteId}/send`, { method: 'POST' })
      if (!sendRes.ok) toast.error('Quote saved but email failed to send.')
      else toast.success('Quote sent to customer!')
    } else {
      toast.success(quoteId ? 'Quote updated.' : 'Quote saved as draft.')
    }

    router.push(`/admin/quotes/${savedQuoteId}`)
  }

  const productType = orderInfo?.product_type ?? null

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {quoteId ? `Edit ${existingQuote?.quote_number ?? 'Quote'}` : 'Create Quote'}
        </h1>
        {orderInfo && (
          <p className="mt-1 text-sm text-gray-500">
            For order <strong>{orderInfo.order_number}</strong> &middot; {orderInfo.profiles?.full_name ?? orderInfo.profiles?.email ?? orderInfo.profiles?.full_name}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-6 max-w-3xl">
        {/* Customer picker — shown when no order is linked (freeform custom quote) */}
        {!resolvedOrderId && !orderId && (
          <Card header={<span className="font-semibold text-gray-900">Customer</span>}>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Select customer</label>
              <select
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Choose a customer —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.full_name ? `${c.full_name} (${c.email})` : c.email}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">A custom order will be created automatically for this customer.</p>
            </div>
          </Card>
        )}

        <PricingCalculator
          productType={productType}
          onApply={applyCalcResult}
          orderConfig={orderInfo?.configuration}
        />

        {materialCostCents > 0 && (
          <div className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">
            Material cost recorded: <strong>{formatCurrency(materialCostCents)}</strong> — margin will be tracked automatically.
          </div>
        )}

        <Card header={<span className="font-semibold text-gray-900">Line items</span>}>
          <div className="flex flex-col gap-3">
            {lineItems.map((item) => (
              <div key={item.id} className="grid grid-cols-2 gap-2 items-start sm:grid-cols-12 rounded-lg bg-gray-50 p-2 sm:bg-transparent sm:p-0">
                <div className="col-span-2 sm:col-span-5">
                  <input
                    placeholder="Description"
                    value={item.description}
                    onChange={e => updateItem(item.id, 'description', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <input
                    type="number" min={1} placeholder="Qty"
                    value={item.quantity}
                    onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <input
                    type="number" min={0} placeholder="Unit $"
                    value={item.unit_price_cents / 100}
                    onChange={e => updateItem(item.id, 'unit_price_cents', Math.round(parseFloat(e.target.value) * 100) || 0)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="col-span-1 sm:col-span-2 flex items-center sm:pt-2 text-sm font-medium text-gray-700">
                  {formatCurrency(item.total_cents)}
                </div>
                <div className="col-span-1 sm:col-span-1 flex items-center sm:pt-1">
                  <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 p-1">
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
                type="number" min={0} max={100} step={0.001}
                value={taxRate}
                onChange={e => setTaxRate(e.target.value)}
                className="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span>%</span>
              <button
                type="button"
                onClick={() => setTaxRate('14.975')}
                className="rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 hover:bg-indigo-100"
              >
                QC (14.975%)
              </button>
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
          <Button onClick={() => handleSave(false)} variant="secondary" loading={loading}>
            {quoteId ? 'Save changes' : 'Save as draft'}
          </Button>
          <Button onClick={() => handleSave(true)} loading={loading}>
            Save &amp; send to customer
          </Button>
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
