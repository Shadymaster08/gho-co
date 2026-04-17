import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import Replicate from 'replicate'
import { v4 as uuidv4 } from 'uuid'

const BRAND_PROMPT_SUFFIX = `
High contrast black and white tones with a warm natural wood surface
(dark walnut or oak table or shelf) as the base element, creating contrast
against a near-black (#0c0c0c) background. Soft directional side lighting,
subtle film grain texture, monochromatic with wood grain as the only warmth,
centered composition, premium minimalist aesthetic, sharp product focus,
cinematic quality, professional studio photography, Gho&Co brand identity.`

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { portfolioImageId } = await request.json()
  if (!portfolioImageId) return NextResponse.json({ error: 'portfolioImageId required' }, { status: 400 })

  const service = createServiceClient()

  const { data: row, error: rowErr } = await service
    .from('portfolio_images')
    .select('*')
    .eq('id', portfolioImageId)
    .single()

  if (rowErr || !row) return NextResponse.json({ error: 'Portfolio image not found' }, { status: 404 })

  // Mark as generating
  await service
    .from('portfolio_images')
    .update({ status: 'generating' })
    .eq('id', portfolioImageId)

  try {
    // Step 1: Fetch image as base64 for Claude Vision
    const imageRes = await fetch(row.original_public_url)
    if (!imageRes.ok) throw new Error('Failed to fetch original image')
    const imageBuffer = await imageRes.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const mimeType = (imageRes.headers.get('content-type') ?? 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

    // Step 2: Claude Vision — analyze product and craft generation prompt
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const visionRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: base64Image },
          },
          {
            type: 'text',
            text: `You are a product photography prompt engineer. Look at this product photo and write a precise, detailed description of the product for an AI image generator. Focus on: what the product is, its shape, material, key features, and any text/branding visible. Be specific and factual. Output only the product description (1-2 sentences), nothing else.`,
          },
        ],
      }],
    })

    const productDescription = (visionRes.content[0] as { type: string; text: string }).text.trim()
    const fullPrompt = `Professional product photography of ${productDescription}. ${BRAND_PROMPT_SUFFIX}`

    // Step 3: Replicate Flux img2img
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

    const output = await replicate.run('black-forest-labs/flux-1.1-pro', {
      input: {
        prompt: fullPrompt,
        image: row.original_public_url,
        prompt_upsampling: true,
        image_prompt_strength: 0.15,
        aspect_ratio: '1:1',
        output_format: 'webp',
        output_quality: 90,
        safety_tolerance: 5,
      },
    })

    // output is a URL string or ReadableStream
    const generatedUrl = typeof output === 'string' ? output : (output as unknown as { url: () => Promise<URL> }).url ? await (output as unknown as { url: () => Promise<URL> }).url() : String(output)

    // Step 4: Download result and re-upload to our Supabase storage
    const genRes = await fetch(String(generatedUrl))
    if (!genRes.ok) throw new Error('Failed to download generated image')
    const genBuffer = await genRes.arrayBuffer()
    const genPath = `generated/${uuidv4()}.webp`

    const { error: storageErr } = await service.storage
      .from('portfolio')
      .upload(genPath, genBuffer, { contentType: 'image/webp', upsert: false })

    if (storageErr) throw new Error(`Storage upload failed: ${storageErr.message}`)

    const { data: { publicUrl: genPublicUrl } } = service.storage
      .from('portfolio')
      .getPublicUrl(genPath)

    // Step 5: Update DB
    await service
      .from('portfolio_images')
      .update({
        status: 'done',
        generated_storage_path: genPath,
        generated_public_url: genPublicUrl,
        prompt_used: fullPrompt,
      })
      .eq('id', portfolioImageId)

    return NextResponse.json({ generated_public_url: genPublicUrl })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('image-enhance agent error:', message)
    await service
      .from('portfolio_images')
      .update({ status: 'error', error_message: message })
      .eq('id', portfolioImageId)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
