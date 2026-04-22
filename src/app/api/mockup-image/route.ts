import { NextResponse } from 'next/server'
import { generateMockupPng } from '@/lib/mockup/generate'

export const runtime = 'nodejs'

// GET /api/mockup-image?style=hoodie&side=front&color=Navy&artworkUrl=...&dtfW=12&dtfH=14&scale=1&ox=0&oy=0&size=400
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams
  const style      = sp.get('style')      ?? 'tshirt'
  const side       = (sp.get('side')      ?? 'front') as 'front' | 'back'
  const color      = sp.get('color')      ?? 'White'
  const artworkUrl = sp.get('artworkUrl') ?? ''
  const dtfW       = parseFloat(sp.get('dtfW')  ?? '12')
  const dtfH       = parseFloat(sp.get('dtfH')  ?? '12')
  const scale      = parseFloat(sp.get('scale') ?? '1')
  const ox         = parseFloat(sp.get('ox')    ?? '0')
  const oy         = parseFloat(sp.get('oy')    ?? '0')
  const outputSize = parseInt(sp.get('size')    ?? '400')

  const output = await generateMockupPng({ style, side, color, artworkUrl, dtfW, dtfH, scale, ox, oy, outputSize })

  if (!output) return new NextResponse('Template not found', { status: 404 })

  return new Response(new Uint8Array(output), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=600' },
  })
}
