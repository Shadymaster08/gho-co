import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { portfolioImageId, imageData } = await request.json()
  if (!portfolioImageId || !imageData) return NextResponse.json({ error: 'portfolioImageId and imageData required' }, { status: 400 })

  const service = createServiceClient()

  try {
    // Strip data URL prefix if present
    const base64 = imageData.replace(/^data:image\/\w+;base64,/, '')
    const inputBuffer = Buffer.from(base64, 'base64')

    // Normalize: cap longest edge at 1800px, convert to JPEG
    const outputBuffer = await sharp(inputBuffer)
      .resize(1800, 1800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 92 })
      .toBuffer()

    const genPath = `generated/${uuidv4()}.jpg`
    const { error: storageErr } = await service.storage
      .from('portfolio')
      .upload(genPath, outputBuffer, { contentType: 'image/jpeg', upsert: false })

    if (storageErr) throw new Error(`Storage upload failed: ${storageErr.message}`)

    const { data: { publicUrl } } = service.storage.from('portfolio').getPublicUrl(genPath)

    await service
      .from('portfolio_images')
      .update({ status: 'done', generated_storage_path: genPath, generated_public_url: publicUrl, prompt_used: 'manual-crop' })
      .eq('id', portfolioImageId)

    return NextResponse.json({ generated_public_url: publicUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await service.from('portfolio_images').update({ status: 'error', error_message: message }).eq('id', portfolioImageId)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
