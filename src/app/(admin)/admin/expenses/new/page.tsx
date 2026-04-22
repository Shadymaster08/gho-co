'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import type { ExpenseCategory } from '@/types'

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'supplies', label: 'Supplies' },
  { value: 'membership', label: 'Membership' },
  { value: 'tools_equipment', label: 'Tools & Equipment' },
  { value: 'other', label: 'Other' },
]

interface AdminProfile {
  id: string
  email: string
  full_name: string | null
}

interface SplitRow {
  admin_id: string
  included: boolean
  share_dollars: string
}

function displayName(p: AdminProfile) {
  return p.full_name ? `${p.full_name} (${p.email})` : p.email
}

function NewExpensePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const expenseId = searchParams.get('expenseId') ?? ''

  const [admins, setAdmins] = useState<AdminProfile[]>([])
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('supplies')
  const [amountDollars, setAmountDollars] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [splits, setSplits] = useState<SplitRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    fetch('/api/admin/customers?role=admin')
      .then(r => r.json())
      .then((data: AdminProfile[]) => {
        setAdmins(data)
        setSplits(data.map(a => ({ admin_id: a.id, included: false, share_dollars: '' })))
        setLoadingData(false)
      })
  }, [])

  // Load existing expense when editing
  useEffect(() => {
    if (!expenseId || loadingData) return
    fetch(`/api/expenses/${expenseId}`)
      .then(r => r.ok ? r.json() : null)
      .then(exp => {
        if (!exp) return
        setTitle(exp.title)
        setCategory(exp.category)
        setAmountDollars((exp.amount_cents / 100).toFixed(2))
        setDate(exp.date)
        setDescription(exp.description ?? '')
        setPaidBy(exp.paid_by)
        const existingSplits: { admin_id: string; share_cents: number }[] = exp.expense_splits ?? []
        setSplits(prev => prev.map(row => {
          const found = existingSplits.find(s => s.admin_id === row.admin_id)
          return found
            ? { ...row, included: true, share_dollars: (found.share_cents / 100).toFixed(2) }
            : row
        }))
      })
  }, [expenseId, loadingData])

  const amountCents = Math.round(parseFloat(amountDollars) * 100) || 0
  const splitTotal = splits
    .filter(s => s.included)
    .reduce((sum, s) => sum + (Math.round(parseFloat(s.share_dollars) * 100) || 0), 0)
  const splitDiff = amountCents - splitTotal

  function toggleAdmin(id: string) {
    setSplits(prev => prev.map(s => s.admin_id === id ? { ...s, included: !s.included, share_dollars: s.included ? '' : s.share_dollars } : s))
  }

  function setShare(id: string, val: string) {
    setSplits(prev => prev.map(s => s.admin_id === id ? { ...s, share_dollars: val } : s))
  }

  function splitEvenly() {
    const included = splits.filter(s => s.included)
    if (!included.length || !amountCents) return
    const each = Math.floor(amountCents / included.length)
    const remainder = amountCents - each * included.length
    setSplits(prev => {
      let rem = remainder
      return prev.map(s => {
        if (!s.included) return s
        const extra = rem > 0 ? 1 : 0
        rem -= extra
        return { ...s, share_dollars: ((each + extra) / 100).toFixed(2) }
      })
    })
  }

  async function handleSave() {
    if (!title.trim()) { toast.error('Title is required.'); return }
    if (!amountCents) { toast.error('Amount is required.'); return }
    if (!paidBy) { toast.error('Paid by is required.'); return }
    if (splits.some(s => s.included) && splitDiff !== 0) {
      toast.error(`Split total must equal the expense amount. Difference: ${formatCurrency(Math.abs(splitDiff))}.`)
      return
    }

    setLoading(true)
    const payload = {
      title: title.trim(),
      category,
      amount_cents: amountCents,
      date,
      description: description.trim() || null,
      paid_by: paidBy,
      splits: splits.filter(s => s.included).map(s => ({
        admin_id: s.admin_id,
        share_cents: Math.round(parseFloat(s.share_dollars) * 100) || 0,
      })),
    }

    const res = expenseId
      ? await fetch(`/api/expenses/${expenseId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })

    if (!res.ok) { toast.error('Failed to save expense.'); setLoading(false); return }
    toast.success(expenseId ? 'Expense updated.' : 'Expense created.')
    router.push('/admin/expenses')
  }

  if (loadingData) return <div className="p-10 text-center text-gray-400">Loading...</div>

  const includedCount = splits.filter(s => s.included).length

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {expenseId ? 'Edit Expense' : 'New Expense'}
      </h1>

      <div className="flex flex-col gap-5">
        {/* Details */}
        <Card header={<span className="font-semibold text-gray-900">Details</span>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Fabrik.ca blank order" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ExpenseCategory)}
                className="w-full rounded-xl border border-[#d2d2d7] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <Input
              label="Amount ($)"
              type="number"
              min="0"
              step="0.01"
              value={amountDollars}
              onChange={e => setAmountDollars(e.target.value)}
              placeholder="0.00"
            />
            <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <div className="sm:col-span-2">
              <Textarea label="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Any extra details..." />
            </div>
          </div>
        </Card>

        {/* Paid by */}
        <Card header={<span className="font-semibold text-gray-900">Paid by</span>}>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Who paid this bill?</label>
            <select
              value={paidBy}
              onChange={e => setPaidBy(e.target.value)}
              className="w-full rounded-xl border border-[#d2d2d7] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            >
              <option value="">— Select admin —</option>
              {admins.map(a => <option key={a.id} value={a.id}>{displayName(a)}</option>)}
            </select>
          </div>
        </Card>

        {/* Splits */}
        <Card header={
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900">Splits</span>
            {includedCount > 0 && amountCents > 0 && (
              <button onClick={splitEvenly} className="text-xs text-indigo-600 hover:underline">Split evenly ({includedCount})</button>
            )}
          </div>
        }>
          <div className="flex flex-col gap-2">
            {admins.map(admin => {
              const row = splits.find(s => s.admin_id === admin.id)
              if (!row) return null
              return (
                <div key={admin.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={row.included}
                    onChange={() => toggleAdmin(admin.id)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    id={`admin-${admin.id}`}
                  />
                  <label htmlFor={`admin-${admin.id}`} className="flex-1 text-sm text-gray-700 cursor-pointer">
                    {displayName(admin)}
                    {admin.id === paidBy && <span className="ml-1.5 text-xs text-indigo-500">· Paid</span>}
                  </label>
                  {row.included && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-500">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.share_dollars}
                        onChange={e => setShare(admin.id, e.target.value)}
                        className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>
              )
            })}

            {includedCount > 0 && amountCents > 0 && (
              <div className={`mt-2 text-right text-xs font-medium ${splitDiff === 0 ? 'text-green-600' : 'text-red-500'}`}>
                {splitDiff === 0
                  ? `✓ Splits match total (${formatCurrency(amountCents)})`
                  : `Splits total ${formatCurrency(splitTotal)} — ${splitDiff > 0 ? `${formatCurrency(splitDiff)} unallocated` : `over by ${formatCurrency(Math.abs(splitDiff))}`}`
                }
              </div>
            )}

            {admins.length === 0 && (
              <p className="text-sm text-gray-400">No admin accounts found.</p>
            )}
          </div>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleSave} loading={loading}>
            {expenseId ? 'Save changes' : 'Create expense'}
          </Button>
          <Button variant="secondary" onClick={() => router.push('/admin/expenses')}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function NewExpensePageWrapper() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-400">Loading...</div>}>
      <NewExpensePage />
    </Suspense>
  )
}
