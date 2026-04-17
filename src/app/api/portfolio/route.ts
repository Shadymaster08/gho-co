import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role === 'admin') {
      const { data } = await supabase
        .from('portfolio_images')
        .select('*')
        .order('created_at', { ascending: false })
      return NextResponse.json(data ?? [])
    }
  }

  // Public — only published
  const { data } = await supabase
    .from('portfolio_images')
    .select('id, title, product_type, generated_public_url, created_at')
    .eq('published', true)
    .not('generated_public_url', 'is', null)
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}

export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const allowed = ['title', 'product_type', 'published']
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  )

  const service = createServiceClient()
  const { data, error } = await service
    .from('portfolio_images')
    .update(filtered)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const service = createServiceClient()

  const { data: row } = await service
    .from('portfolio_images')
    .select('original_storage_path, generated_storage_path')
    .eq('id', id)
    .single()

  if (row) {
    const paths = [row.original_storage_path, row.generated_storage_path].filter(Boolean) as string[]
    if (paths.length > 0) {
      await service.storage.from('portfolio').remove(paths)
    }
  }

  await service.from('portfolio_images').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
