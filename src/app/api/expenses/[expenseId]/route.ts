import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(_req: Request, { params }: { params: Promise<{ expenseId: string }> }) {
  const { expenseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('expenses')
    .select('*, profiles!expenses_paid_by_fkey(email, full_name), expense_splits(*, profiles(email, full_name))')
    .eq('id', expenseId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ expenseId: string }> }) {
  const { expenseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, category, amount_cents, date, description, paid_by, splits } = await request.json()
  const service = createServiceClient()

  const update: Record<string, unknown> = {}
  if (title !== undefined) update.title = title
  if (category !== undefined) update.category = category
  if (amount_cents !== undefined) update.amount_cents = amount_cents
  if (date !== undefined) update.date = date
  if (description !== undefined) update.description = description || null
  if (paid_by !== undefined) update.paid_by = paid_by

  const { data: expense, error } = await service
    .from('expenses')
    .update(update)
    .eq('id', expenseId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  if (splits !== undefined) {
    await service.from('expense_splits').delete().eq('expense_id', expenseId)
    if (splits.length) {
      await service.from('expense_splits').insert(
        splits.map((s: { admin_id: string; share_cents: number }) => ({
          expense_id: expenseId,
          admin_id: s.admin_id,
          share_cents: s.share_cents,
        }))
      )
    }
  }

  return NextResponse.json(expense)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ expenseId: string }> }) {
  const { expenseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient()
  await service.from('expenses').delete().eq('id', expenseId)
  return NextResponse.json({ success: true })
}
