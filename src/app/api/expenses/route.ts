import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('expenses')
    .select('*, profiles!expenses_paid_by_fkey(email, full_name), expense_splits(*, profiles(email, full_name))')
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, category, amount_cents, date, description, paid_by, splits } = await request.json()

  const service = createServiceClient()
  const { data: expense, error } = await service
    .from('expenses')
    .insert({ title, category, amount_cents, date, description: description || null, paid_by, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })

  if (splits?.length) {
    await service.from('expense_splits').insert(
      splits.map((s: { admin_id: string; share_cents: number }) => ({
        expense_id: expense.id,
        admin_id: s.admin_id,
        share_cents: s.share_cents,
      }))
    )
  }

  return NextResponse.json(expense, { status: 201 })
}
