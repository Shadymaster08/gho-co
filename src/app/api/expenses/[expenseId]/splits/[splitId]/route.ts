import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ expenseId: string; splitId: string }> }
) {
  const { expenseId, splitId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient()

  const { data: split } = await service
    .from('expense_splits')
    .select('is_reimbursed')
    .eq('id', splitId)
    .single()

  const nowReimbursed = !split?.is_reimbursed
  await service
    .from('expense_splits')
    .update({ is_reimbursed: nowReimbursed, reimbursed_at: nowReimbursed ? new Date().toISOString() : null })
    .eq('id', splitId)

  // If all splits for this expense are reimbursed, mark expense settled
  const { data: allSplits } = await service
    .from('expense_splits')
    .select('is_reimbursed')
    .eq('expense_id', expenseId)

  const allSettled = allSplits?.every(s => s.is_reimbursed) ?? false
  await service.from('expenses').update({ status: allSettled ? 'settled' : 'open' }).eq('id', expenseId)

  return NextResponse.json({ is_reimbursed: nowReimbursed, expense_settled: allSettled })
}
