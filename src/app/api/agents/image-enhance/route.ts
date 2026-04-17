import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import Replicate from 'replicate'
import { v4 as uuidv4 } from 'uuid'

const PROMPTS: Record<string, string> = {
  shirt: `Product photo cleanup. Replace the background with pure white (#ffffff). Remove any person, hanger, mannequin, surface, or props — leave only the garment. Do not rotate, flip or reposition the garment in any way — preserve its exact orientation from the original photo. Keep every print, graphic, text, colour and detail on the garment pixel-perfect. The garment should be vertically centred and fill roughly 80% of the frame height, with equal white space on left and right. Soft even diffused lighting, no shadows, no gradients. The result must look identical in framing and scale to other shirts in the same product line.`,

  '3d_print': `Keep the 3D printed object exactly as it is — do not alter its shape, color or details. Replace the background with a clean soft off-white surface. Place the object on a smooth matte light surface with a very subtle shadow underneath. Stylised product photography: strong directional key light from upper left casting a gentle dramatic shadow, warm rim light from behind adding depth, soft fill to avoid pure black. The lighting should feel editorial and moody while keeping the object clearly readable. Sharp focus on all details and layer lines.`,

  lighting: `Clean up this lighting product photo into a high-end commercial image. Remove any cables, wires, or cords from the scene entirely. Replace the background with a very dark charcoal grey (#1a1a1a) — not pure black, so depth is visible. The product sits on a smooth dark reflective surface with a subtle clean reflection underneath. The product itself should be well-lit and clearly visible — bright enough to see all its details, textures and materials. Its LEDs or light strips glow with their natural colour. Soft fill light keeps the product readable without washing out the glow. Premium product catalog look — think high-end interior brand or architectural lighting showroom.`,

  default: `Keep the product exactly as it is. Replace only the background with a pure white studio background. Add professional soft diffused overhead lighting, no harsh shadows. Tilt the product slightly at a diagonal angle. Clean editorial lookbook style. Product details must remain sharp and readable.`,
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { portfolioImageId, productType, shirtSide } = await request.json()
  if (!portfolioImageId) return NextResponse.json({ error: 'portfolioImageId required' }, { status: 400 })

  const service = createServiceClient()

  const { data: row, error: rowErr } = await service
    .from('portfolio_images')
    .select('*')
    .eq('id', portfolioImageId)
    .single()

  if (rowErr || !row) return NextResponse.json({ error: 'Portfolio image not found' }, { status: 404 })

  // Mark as generating and save product type
  await service
    .from('portfolio_images')
    .update({ status: 'generating', ...(productType ? { product_type: productType } : {}) })
    .eq('id', portfolioImageId)

  try {
    // Step 1: Fetch image as base64 for Claude Vision
    const imageRes = await fetch(row.original_public_url)
    if (!imageRes.ok) throw new Error('Failed to fetch original image')
    const imageBuffer = await imageRes.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const mimeType = (imageRes.headers.get('content-type') ?? 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

    // Step 2: Claude Vision — analyze product and craft generation prompt (optional)
    let productDescription = 'a custom product'
    if (process.env.ANTHROPIC_API_KEY) {
      try {
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
        productDescription = (visionRes.content[0] as { type: string; text: string }).text.trim()
      } catch (e) {
        console.warn('Claude Vision failed, using generic prompt:', e)
      }
    }

    let basePrompt = PROMPTS[productType] ?? PROMPTS.default
    if (productType === 'shirt' && shirtSide) {
      basePrompt = `The input photo shows the ${shirtSide} of the garment. Preserve this exact view — do not rotate, flip or show the other side. ` + basePrompt
    }
    const fullPrompt = productDescription !== 'a custom product'
      ? `${basePrompt} The product is: ${productDescription}.`
      : basePrompt

    // Step 3: Replicate Flux img2img
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

    const output = await replicate.run('black-forest-labs/flux-kontext-pro', {
      input: {
        prompt: fullPrompt,
        input_image: row.original_public_url,
        aspect_ratio: '1:1',
        output_format: 'jpg',
        output_quality: 90,
        safety_tolerance: 5,
      },
    })

    // output is a URL string or ReadableStream from Replicate
    let generatedUrl: string
    if (typeof output === 'string') {
      generatedUrl = output
    } else if (output && typeof (output as { url?: () => Promise<URL> }).url === 'function') {
      generatedUrl = String(await (output as { url: () => Promise<URL> }).url())
    } else {
      generatedUrl = String(output)
    }

    // Step 4: Download result and re-upload to our Supabase storage
    const genRes = await fetch(String(generatedUrl))
    if (!genRes.ok) throw new Error('Failed to download generated image')
    const genBuffer = await genRes.arrayBuffer()
    const genPath = `generated/${uuidv4()}.jpg`

    const { error: storageErr } = await service.storage
      .from('portfolio')
      .upload(genPath, genBuffer, { contentType: 'image/jpeg', upsert: false })

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
