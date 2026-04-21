import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('screenshot') as File | null
  if (!file) return NextResponse.json({ error: 'screenshot required' }, { status: 400 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const mimeType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mimeType, data: base64 },
        },
        {
          type: 'text',
          text: `You are analyzing a screenshot from a 3D printing slicer application (Bambu Studio, Cura, PrusaSlicer, OrcaSlicer, etc.).

Extract the following values and return ONLY valid JSON, no other text:
{
  "print_time_minutes": <total print time in minutes as a number, null if not visible>,
  "filament_weight_g": <filament weight in grams as a number, null if not visible>,
  "filament_cost_dollars": <filament cost in dollars as a number, null if not visible>,
  "filament_type": <filament material type string e.g. "PLA", "PETG", "TPU", null if not visible>,
  "model_name": <name of the model/file if visible, null if not>,
  "notes": <any other relevant info visible in the screenshot, or null>
}

If a value is not clearly visible, use null. For print time, convert to total minutes (e.g. "3h 24m" → 204).`,
        },
      ],
    }],
  })

  const text = (response.content[0] as { type: string; text: string }).text.trim()

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Failed to parse slicer data', raw: text }, { status: 422 })
  }
}
