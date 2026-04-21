import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

const ALLOWED_TYPES: Record<string, { mimes: string[]; maxBytes: number }> = {
  front_artwork: { mimes: ['image/png', 'image/jpeg', 'image/webp'], maxBytes: 25 * 1024 * 1024 },
  back_artwork:  { mimes: ['image/png', 'image/jpeg', 'image/webp'], maxBytes: 25 * 1024 * 1024 },
  stl:           { mimes: ['model/stl', 'application/octet-stream', 'application/sla'], maxBytes: 100 * 1024 * 1024 },
  reference:     { mimes: ['image/png', 'image/jpeg', 'image/webp'], maxBytes: 10 * 1024 * 1024 },
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const serviceSupabase = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { order_id, file_type, file_name, mime_type, file_size_bytes } = await request.json()

  if (!order_id || !file_type || !file_name || !mime_type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const constraints = ALLOWED_TYPES[file_type as string]
  if (!constraints) return NextResponse.json({ error: 'Invalid file_type' }, { status: 400 })

  if (!constraints.mimes.includes(mime_type)) {
    return NextResponse.json({ error: `Invalid mime type for ${file_type}` }, { status: 400 })
  }

  if (file_size_bytes && file_size_bytes > constraints.maxBytes) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 })
  }

  // Verify the order belongs to this user
  const { data: order } = await supabase
    .from('orders')
    .select('customer_id')
    .eq('id', order_id)
    .single()

  if (!order || order.customer_id !== user.id) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const ext = file_name.split('.').pop() ?? 'bin'
  const storage_path = `orders/${order_id}/${randomUUID()}.${ext}`

  const { data: signedData, error: signError } = await serviceSupabase.storage
    .from('order-files')
    .createSignedUploadUrl(storage_path)

  if (signError || !signedData) {
    console.error('Presign error:', signError)
    return NextResponse.json({ error: signError?.message ?? 'Failed to generate upload URL' }, { status: 500 })
  }

  // Insert record into order_files
  await supabase.from('order_files').insert({
    order_id,
    file_type,
    storage_path,
    file_name,
    file_size_bytes: file_size_bytes ?? null,
    mime_type,
  })

  const publicUrl = supabase.storage.from('order-files').getPublicUrl(storage_path).data.publicUrl

  return NextResponse.json({
    signedUrl: signedData.signedUrl,
    token: signedData.token,
    storage_path,
    public_url: publicUrl,
  })
}
