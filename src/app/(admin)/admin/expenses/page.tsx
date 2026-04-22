'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Trash2, Plus, Download, Receipt } from 'lucide-react'
import type { Expense, ExpenseSplit, ExpenseCategory, ExpenseStatus } from '@/types'

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  supplies: 'Supplies',
  membership: 'Membership',
  tools_equipment: 'Tools & Equipment',
  other: 'Other',
}

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  supplies: 'bg-blue-100 text-blue-700',
  membership: 'bg-purple-100 text-purple-700',
  tools_equipment: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-600',
}

function CategoryPill({ category }: { category: ExpenseCategory }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[category]}`}>
      {CATEGORY_LABELS[category]}
    </span>
  )
}

function StatusPill({ status }: { status: ExpenseStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status === 'settled' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
      {status === 'settled' ? 'Settled' : 'Open'}
    </span>
  )
}

function displayName(p: { full_name: string | null; email: string } | undefined) {
  if (!p) return '—'
  return p.full_name ?? p.email
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [monthFilter, setMonthFilter] = useState<string>('')

  useEffect(() => {
    fetch('/api/expenses')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setExpenses(data); setLoading(false) })
  }, [])

  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Summary stats (always over current month)
  const monthExpenses = useMemo(() =>
    expenses.filter(e => e.date.startsWith(thisMonth)),
    [expenses, thisMonth]
  )
  const totalThisMonth = monthExpenses.reduce((s, e) => s + e.amount_cents, 0)
  const outstanding = expenses
    .flatMap(e => e.expense_splits ?? [])
    .filter(s => !s.is_reimbursed)
    .reduce((sum, s) => sum + s.share_cents, 0)
  const settledThisMonth = monthExpenses.filter(e => e.status === 'settled').length
  const openCount = expenses.filter(e => e.status === 'open').length

  // Filtered list
  const filtered = useMemo(() => expenses.filter(e => {
    if (categoryFilter && e.category !== categoryFilter) return false
    if (statusFilter && e.status !== statusFilter) return false
    if (monthFilter && !e.date.startsWith(monthFilter)) return false
    return true
  }), [expenses, categoryFilter, statusFilter, monthFilter])

  async function toggleReimbursed(expenseId: string, splitId: string) {
    setTogglingId(splitId)
    const res = await fetch(`/api/expenses/${expenseId}/splits/${splitId}`, { method: 'PATCH' })
    if (!res.ok) { toast.error('Failed to update.'); setTogglingId(null); return }
    const { is_reimbursed, expense_settled } = await res.json()
    setExpenses(prev => prev.map(e => {
      if (e.id !== expenseId) return e
      const splits = (e.expense_splits ?? []).map(s =>
        s.id === splitId ? { ...s, is_reimbursed, reimbursed_at: is_reimbursed ? new Date().toISOString() : null } : s
      )
      return { ...e, expense_splits: splits, status: expense_settled ? 'settled' : 'open' }
    }))
    toast.success(is_reimbursed ? 'Marked as reimbursed.' : 'Marked as outstanding.')
    setTogglingId(null)
  }

  async function deleteExpense(expenseId: string) {
    if (!confirm('Delete this expense?')) return
    setDeletingId(expenseId)
    await fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' })
    setExpenses(prev => prev.filter(e => e.id !== expenseId))
    if (expandedId === expenseId) setExpandedId(null)
    toast.success('Expense deleted.')
    setDeletingId(null)
  }

  if (loading) return <div className="p-10 text-center text-gray-400">Loading...</div>

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-400">Internal expense tracking — admins only</p>
        </div>
        <div className="flex gap-2">
          <a href="/api/expenses/export" download>
            <Button variant="secondary"><Download className="h-4 w-4 mr-1.5" />Export</Button>
          </a>
          <Link href="/admin/expenses/new">
            <Button><Plus className="h-4 w-4 mr-1.5" />Add expense</Button>
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Spent this month', value: formatCurrency(totalThisMonth) },
          { label: 'Outstanding', value: formatCurrency(outstanding), highlight: outstanding > 0 },
          { label: 'Settled this month', value: String(settledThisMonth) },
          { label: 'Open expenses', value: String(openCount) },
        ].map(({ label, value, highlight }) => (
          <Card key={label} className="!p-4">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-xl font-bold ${highlight ? 'text-orange-600' : 'text-gray-900'}`}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All categories</option>
          {(Object.entries(CATEGORY_LABELS) as [ExpenseCategory, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="settled">Settled</option>
        </select>
        <input
          type="month"
          value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {(categoryFilter || statusFilter || monthFilter) && (
          <button onClick={() => { setCategoryFilter(''); setStatusFilter(''); setMonthFilter('') }} className="text-xs text-indigo-600 hover:underline px-2">
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-gray-400 py-6">No expenses found. <Link href="/admin/expenses/new" className="text-indigo-600 hover:underline">Add one.</Link></p>
        </Card>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Expense #</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium">Paid by</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(expense => {
                  const isExpanded = expandedId === expense.id
                  const splits: ExpenseSplit[] = expense.expense_splits ?? []
                  return (
                    <>
                      <tr
                        key={expense.id}
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : expense.id)}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{expense.expense_number}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{expense.title}</td>
                        <td className="px-4 py-3"><CategoryPill category={expense.category} /></td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(expense.date)}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(expense.amount_cents)}</td>
                        <td className="px-4 py-3 text-gray-600">{displayName((expense as any).profiles)}</td>
                        <td className="px-4 py-3"><StatusPill status={expense.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <Link href={`/admin/expenses/new?expenseId=${expense.id}`} className="p-1 text-gray-400 hover:text-indigo-600 text-xs">Edit</Link>
                            <button
                              onClick={() => deleteExpense(expense.id)}
                              disabled={deletingId === expense.id}
                              className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${expense.id}-splits`} className="bg-gray-50 border-b">
                          <td colSpan={8} className="px-6 py-4">
                            {splits.length === 0 ? (
                              <p className="text-sm text-gray-400">No splits recorded.</p>
                            ) : (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Splits</p>
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-xs text-gray-400">
                                      <th className="pb-1 text-left font-medium">Admin</th>
                                      <th className="pb-1 text-right font-medium">Share</th>
                                      <th className="pb-1 text-center font-medium">Reimbursed</th>
                                      <th className="pb-1 text-left font-medium pl-4">Date</th>
                                      <th className="pb-1" />
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {splits.map(split => {
                                      const isPayer = split.admin_id === expense.paid_by
                                      return (
                                        <tr key={split.id} className="border-t border-gray-200">
                                          <td className="py-1.5 text-gray-700">
                                            {displayName((split as any).profiles)}
                                            {isPayer && <span className="ml-1.5 text-xs text-indigo-500 font-medium">· Paid</span>}
                                          </td>
                                          <td className="py-1.5 text-right font-medium">{formatCurrency(split.share_cents)}</td>
                                          <td className="py-1.5 text-center">
                                            {split.is_reimbursed
                                              ? <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
                                              : <Circle className="h-4 w-4 text-gray-300 inline" />
                                            }
                                          </td>
                                          <td className="py-1.5 pl-4 text-gray-400 text-xs">
                                            {split.reimbursed_at ? formatDate(split.reimbursed_at) : '—'}
                                          </td>
                                          <td className="py-1.5 text-right">
                                            {!isPayer && (
                                              <button
                                                onClick={() => toggleReimbursed(expense.id, split.id)}
                                                disabled={togglingId === split.id}
                                                className={`text-xs px-2 py-0.5 rounded-full border transition-colors disabled:opacity-50 ${
                                                  split.is_reimbursed
                                                    ? 'border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-500'
                                                    : 'border-green-300 text-green-700 hover:bg-green-50'
                                                }`}
                                              >
                                                {split.is_reimbursed ? 'Undo' : 'Mark reimbursed'}
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                                {(expense as any).receipt_url && (
                                  <div className="mt-3 border-t border-gray-200 pt-3 flex items-start gap-3">
                                    <Receipt className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                                    {(expense as any).receipt_url.match(/\.(png|jpg|jpeg|webp|heic)$/i) ? (
                                      <a href={(expense as any).receipt_url} target="_blank" rel="noopener noreferrer">
                                        <img src={(expense as any).receipt_url} alt="Receipt" className="h-28 w-auto rounded-lg border border-gray-200 object-cover hover:opacity-80 transition-opacity" />
                                      </a>
                                    ) : (
                                      <a href={(expense as any).receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline">
                                        View receipt
                                      </a>
                                    )}
                                  </div>
                                )}
                                {expense.description && (
                                  <p className="mt-3 text-xs text-gray-500 border-t border-gray-200 pt-2">{expense.description}</p>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
