import { NextResponse } from 'next/server'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { getColorHex } from '@/lib/supplier/fabrik-catalog'

export const runtime = 'nodejs'

const TEMPLATE_DIMS: Record<string, { w: number; h: number }> = {
  'tshirt-front':     { w: 600, h: 761 },
  'tshirt-back':      { w: 600, h: 748 },
  'longsleeve-front': { w: 600, h: 761 },
  'longsleeve-back':  { w: 600, h: 806 },
  'crewneck-front':   { w: 600, h: 696 },
  'crewneck-back':    { w: 600, h: 733 },
  'hoodie-front':     { w: 600, h: 843 },
  'hoodie-back':      { w: 600, h: 862 },
  'ziphoodie-front':  { w: 600, h: 837 },
  'ziphoodie-back':   { w: 600, h: 844 },
}

const TEMPLATE_META: Record<string, { frontCenterY: number; backCenterY: number }> = {
  tshirt:     { frontCenterY: 280, backCenterY: 255 },
  longsleeve: { frontCenterY: 280, backCenterY: 255 },
  crewneck:   { frontCenterY: 265, backCenterY: 255 },
  hoodie:     { frontCenterY: 330, backCenterY: 305 },
  ziphoodie:  { frontCenterY: 340, backCenterY: 305 },
}

const PX_PER_INCH = 19

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

// GET /api/mockup-image?style=hoodie&side=front&color=Navy&artworkUrl=...&dtfW=12&dtfH=14&scale=1&ox=0&oy=0&size=400
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams
  const style      = sp.get('style')      ?? 'tshirt'
  const side       = sp.get('side')       ?? 'front'
  const color      = sp.get('color')      ?? 'White'
  const artworkUrl = sp.get('artworkUrl') ?? ''
  const dtfW       = parseFloat(sp.get('dtfW')  ?? '12')
  const dtfH       = parseFloat(sp.get('dtfH')  ?? '12')
  const scale      = parseFloat(sp.get('scale') ?? '1')
  const ox         = parseFloat(sp.get('ox')    ?? '0')
  const oy         = parseFloat(sp.get('oy')    ?? '0')
  const outputSize = parseInt(sp.get('size')    ?? '400')

  const dims  = TEMPLATE_DIMS[`${style}-${side}`] ?? { w: 600, h: 800 }
  const meta  = TEMPLATE_META[style]              ?? TEMPLATE_META.tshirt

  const templatePath = path.join(process.cwd(), 'public', 'mockup-templates', `${style}-${side}.png`)
  if (!fs.existsSync(templatePath)) {
    return new NextResponse('Template not found', { status: 404 })
  }
  const templateBuf = fs.readFileSync(templatePath)

  // Step 1: color tint via multiply blend
  const { r, g, b } = hexToRgb(getColorHex(color) ?? '#d0d0d0')
  const colorFlood = await sharp({
    create: { width: dims.w, height: dims.h, channels: 3, background: { r, g, b } },
  }).png().toBuffer()

  let result = await sharp(templateBuf)
    .composite([{ input: colorFlood, blend: 'multiply' }])
    .toBuffer()

  // Step 2: artwork overlay
  if (artworkUrl) {
    try {
      const artRes = await fetch(artworkUrl, { signal: AbortSignal.timeout(8000) })
      if (artRes.ok) {
        const artBuf  = Buffer.from(await artRes.arrayBuffer())
        const centerY = side === 'front' ? meta.frontCenterY : meta.backCenterY
        const artPxW  = Math.round(dtfW * PX_PER_INCH * scale)
        const artPxH  = Math.round(dtfH * PX_PER_INCH * scale)
        const left    = Math.round(dims.w / 2 - artPxW / 2 + ox)
        const top     = Math.round(centerY    - artPxH / 2 + oy)

        const resizedArt = await sharp(artBuf)
          .resize(artPxW, artPxH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer()

        result = await sharp(result)
          .composite([{ input: resizedArt, left: Math.max(0, left), top: Math.max(0, top) }])
          .toBuffer()
      }
    } catch {
      // artwork unavailable — render without it
    }
  }

  // Step 3: subtle fabric depth — template at ~20% over the artwork
  const depthLayer = await sharp(templateBuf).ensureAlpha(0.20).png().toBuffer()
  result = await sharp(result)
    .composite([{ input: depthLayer, blend: 'over' }])
    .toBuffer()

  // Step 4: resize for email and return
  const output = await sharp(result)
    .resize(outputSize, undefined, { fit: 'inside' })
    .png()
    .toBuffer()

  return new Response(new Uint8Array(output), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=600' },
  })
}
