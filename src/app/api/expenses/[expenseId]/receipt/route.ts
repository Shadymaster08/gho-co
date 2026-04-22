import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: Request, { params }: { params: Promise<{ expenseId: string }> }) {
  const { expenseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const form = await request.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'application/pdf']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use PNG, JPG, WEBP, HEIC, or PDF.' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const storagePath = `receipts/expense-${expenseId}.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const service = createServiceClient()
  const { error: uploadError } = await service.storage
    .from('order-files')
    .upload(storagePath, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = service.storage.from('order-files').getPublicUrl(storagePath)

  await service.from('expenses').update({ receipt_url: publicUrl }).eq('id', expenseId)

  return NextResponse.json({ receipt_url: publicUrl })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ expenseId: string }> }) {
  const { expenseId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient()
  await service.from('expenses').update({ receipt_url: null }).eq('id', expenseId)
  return NextResponse.json({ success: true })
}
