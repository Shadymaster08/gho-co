import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, WebP, and HEIC images are allowed' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const storagePath = `originals/${uuidv4()}.${ext}`

  const service = createServiceClient()
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadErr } = await service.storage
    .from('portfolio')
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadErr) {
    console.error('portfolio upload error:', uploadErr)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data: { publicUrl } } = service.storage
    .from('portfolio')
    .getPublicUrl(storagePath)

  const { data: row, error: dbErr } = await service
    .from('portfolio_images')
    .insert({
      original_storage_path: storagePath,
      original_public_url: publicUrl,
      status: 'pending',
    })
    .select()
    .single()

  if (dbErr) {
    console.error('portfolio db insert error:', dbErr)
    return NextResponse.json({ error: 'Database insert failed' }, { status: 500 })
  }

  return NextResponse.json({ id: row.id, original_public_url: publicUrl })
}
