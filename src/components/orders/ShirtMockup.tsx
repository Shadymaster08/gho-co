'use client'

import { getColorHex } from '@/lib/supplier/fabrik-catalog'
import { normalizeShirtConfig } from '@/lib/pricing'
import { useState, useRef, useEffect, useCallback } from 'react'
import { RotateCcw, Move, Save, ZoomIn } from 'lucide-react'

export interface ShirtMockupProps {
  shirtStyle?: string
  color?: string
  frontArtworkUrl?: string | null
  backArtworkUrl?: string | null
  dtfFrontWidth?: number | null
  dtfFrontHeight?: number | null
  dtfBackWidth?: number | null
  dtfBackHeight?: number | null
  initialFrontOffset?: { x: number; y: number; scale?: number }
  initialBackOffset?:  { x: number; y: number; scale?: number }
  onSave?: (
    frontOffset: { x: number; y: number; scale: number },
    backOffset:  { x: number; y: number; scale: number },
  ) => Promise<void>
  className?: string
}

// Natural dimensions after resizing to 600px wide
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

// Art center Y in template pixels; PX_PER_INCH at 600px wide ≈ 19
const TEMPLATE_META: Record<string, { frontCenterY: number; backCenterY: number }> = {
  tshirt:     { frontCenterY: 280, backCenterY: 255 },
  longsleeve: { frontCenterY: 280, backCenterY: 255 },
  crewneck:   { frontCenterY: 265, backCenterY: 255 },
  hoodie:     { frontCenterY: 330, backCenterY: 305 },
  ziphoodie:  { frontCenterY: 340, backCenterY: 305 },
}
const PX_PER_INCH = 19  // template pixels per DTF inch at 600px wide

function isLight(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 128
}

export function ShirtMockup({
  shirtStyle = 'tshirt',
  color = 'White',
  frontArtworkUrl,
  backArtworkUrl,
  dtfFrontWidth  = 12,
  dtfFrontHeight = 12,
  dtfBackWidth,
  dtfBackHeight,
  initialFrontOffset = { x: 0, y: 0, scale: 1 },
  initialBackOffset  = { x: 0, y: 0, scale: 1 },
  onSave,
  className = '',
}: ShirtMockupProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const [side, setSide] = useState<'front' | 'back'>('front')
  const [frontState, setFrontState] = useState({ x: initialFrontOffset.x, y: initialFrontOffset.y, scale: initialFrontOffset.scale ?? 1 })
  const [backState,  setBackState]  = useState({ x: initialBackOffset.x,  y: initialBackOffset.y,  scale: initialBackOffset.scale  ?? 1 })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  const draggingRef  = useRef(false)
  const sideRef      = useRef<'front' | 'back'>('front')
  const frontRef     = useRef(frontState)
  const backRef      = useRef(backState)
  const dragAnchor   = useRef({ tmplX: 0, tmplY: 0, offX: 0, offY: 0 })

  useEffect(() => { sideRef.current  = side }, [side])
  useEffect(() => { frontRef.current = frontState }, [frontState])
  useEffect(() => { backRef.current  = backState  }, [backState])

  const isFront = side === 'front'
  const state   = isFront ? frontState : backState
  const templateKey = `${shirtStyle}-${side}`
  const dims  = TEMPLATE_DIMS[templateKey] ?? { w: 600, h: 800 }
  const meta  = TEMPLATE_META[shirtStyle]  ?? TEMPLATE_META.tshirt

  const toTemplateCoords = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: ((clientX - rect.left)  / rect.width)  * dims.w,
      y: ((clientY - rect.top)   / rect.height) * dims.h,
    }
    // deps intentionally omit dims — dims.w/h are stable per render; stale closure is fine
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startDrag = useCallback((clientX: number, clientY: number) => {
    draggingRef.current = true
    const { x, y } = toTemplateCoords(clientX, clientY)
    const s = sideRef.current === 'front' ? frontRef.current : backRef.current
    dragAnchor.current = { tmplX: x, tmplY: y, offX: s.x, offY: s.y }
  }, [toTemplateCoords])

  useEffect(() => {
    const move = (clientX: number, clientY: number) => {
      if (!draggingRef.current) return
      const { x, y } = toTemplateCoords(clientX, clientY)
      const newOff = {
        x: dragAnchor.current.offX + (x - dragAnchor.current.tmplX),
        y: dragAnchor.current.offY + (y - dragAnchor.current.tmplY),
      }
      if (sideRef.current === 'front') setFrontState(s => ({ ...s, ...newOff }))
      else                             setBackState(s  => ({ ...s, ...newOff }))
    }
    const mm = (e: MouseEvent) => move(e.clientX, e.clientY)
    const mu = () => { draggingRef.current = false }
    const tm = (e: TouchEvent) => { e.preventDefault(); const t = e.touches[0]; move(t.clientX, t.clientY) }
    const te = () => { draggingRef.current = false }
    window.addEventListener('mousemove', mm)
    window.addEventListener('mouseup', mu)
    window.addEventListener('touchmove', tm, { passive: false })
    window.addEventListener('touchend', te)
    return () => {
      window.removeEventListener('mousemove', mm)
      window.removeEventListener('mouseup', mu)
      window.removeEventListener('touchmove', tm)
      window.removeEventListener('touchend', te)
    }
  }, [toTemplateCoords])

  const hex   = getColorHex(color) ?? '#d0d0d0'
  const light = isLight(hex)

  const artUrl = isFront ? frontArtworkUrl : backArtworkUrl
  const artW   = Number((isFront ? dtfFrontWidth  : dtfBackWidth)  ?? 12)
  const artH   = Number((isFront ? dtfFrontHeight : dtfBackHeight) ?? 12)

  const artPxW   = artW * PX_PER_INCH * state.scale
  const artPxH   = artH * PX_PER_INCH * state.scale
  const centerY  = isFront ? meta.frontCenterY : meta.backCenterY
  const artX     = dims.w / 2 - artPxW / 2 + state.x
  const artY     = centerY    - artPxH / 2 + state.y

  const artLeftPct = (artX / dims.w) * 100
  const artTopPct  = (artY / dims.h) * 100
  const artWPct    = (artPxW / dims.w) * 100
  const artHPct    = (artPxH / dims.h) * 100

  const initFront = { x: initialFrontOffset.x, y: initialFrontOffset.y, scale: initialFrontOffset.scale ?? 1 }
  const initBack  = { x: initialBackOffset.x,  y: initialBackOffset.y,  scale: initialBackOffset.scale  ?? 1 }
  const hasChanged =
    frontState.x !== initFront.x || frontState.y !== initFront.y || frontState.scale !== initFront.scale ||
    backState.x  !== initBack.x  || backState.y  !== initBack.y  || backState.scale  !== initBack.scale

  const templateSrc   = `/mockup-templates/${shirtStyle}-${side}.png`
  const borderColor   = light ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.40)'
  const placeholderFill = light ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.55)'

  async function handleSave() {
    if (!onSave) return
    setSaving(true)
    await onSave(frontState, backState)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function resetCurrent() {
    if (isFront) setFrontState({ x: 0, y: 0, scale: 1 })
    else         setBackState({ x: 0, y: 0, scale: 1 })
  }

  const isReset = state.x === 0 && state.y === 0 && state.scale === 1

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>

      {/* Front / Back toggle */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <div className="flex overflow-hidden rounded-lg border border-gray-200 text-xs">
          {(['front', 'back'] as const).map(s => (
            <button key={s} type="button" onClick={() => setSide(s)}
              className={`px-3 py-1.5 font-medium capitalize transition-colors ${
                side === s ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >{s}</button>
          ))}
        </div>

        {!isReset && (
          <button type="button" onClick={resetCurrent}
            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        )}

        {onSave && hasChanged && (
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            <Save className="h-3 w-3" />
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>

      {/* Scale slider */}
      {artUrl && (
        <div className="flex items-center gap-2 w-full max-w-[260px]">
          <ZoomIn className="h-3 w-3 text-gray-400 shrink-0" />
          <input
            type="range"
            min={40} max={500} step={1}
            value={Math.round(state.scale * 100)}
            onChange={e => {
              const s = parseInt(e.target.value) / 100
              if (isFront) setFrontState(st => ({ ...st, scale: s }))
              else         setBackState(st  => ({ ...st, scale: s }))
            }}
            className="flex-1 h-1 accent-indigo-600"
          />
          <span className="text-xs text-gray-400 w-9 text-right">{Math.round(state.scale * 100)}%</span>
        </div>
      )}

      {/* Mockup stack */}
      <div
        ref={containerRef}
        className="relative w-full max-w-[260px] select-none overflow-hidden rounded-sm"
        style={{ isolation: 'isolate' }}
      >
        {/* Layer 1: Photo template */}
        <img src={templateSrc} alt={`${shirtStyle} ${side}`} className="block w-full" draggable={false} />

        {/* Layer 2: Shirt color via multiply blend */}
        <div style={{ position: 'absolute', inset: 0, backgroundColor: hex, mixBlendMode: 'multiply' }} />

        {/* Layer 3a: Artwork */}
        {artUrl && (
          <img
            src={artUrl}
            draggable={false}
            style={{
              position: 'absolute',
              left:   `${artLeftPct}%`,
              top:    `${artTopPct}%`,
              width:  `${artWPct}%`,
              height: `${artHPct}%`,
              objectFit: 'contain',
              cursor: 'grab',
              userSelect: 'none',
            }}
            onMouseDown={e => { e.preventDefault(); startDrag(e.clientX, e.clientY) }}
            onTouchStart={e => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY) }}
          />
        )}

        {/* Layer 3b: Placeholder when no artwork */}
        {!artUrl && (
          <svg viewBox={`0 0 ${dims.w} ${dims.h}`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          >
            <rect x={artX} y={artY} width={artPxW} height={artPxH}
              fill="none" rx="3" stroke={borderColor} strokeWidth="1.5" strokeDasharray="8 4" />
            <text x={artX + artPxW / 2} y={artY + artPxH / 2}
              textAnchor="middle" dominantBaseline="middle"
              fill={placeholderFill} fontSize="14" fontFamily="system-ui, sans-serif"
            >{artW}″ × {artH}″</text>
          </svg>
        )}

        {/* Layer 4: Fabric depth */}
        <img src={templateSrc} alt="" aria-hidden="true" draggable={false}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            mixBlendMode: 'multiply', opacity: 0.22, pointerEvents: 'none',
          }}
        />
      </div>

      {/* Caption */}
      <div className="flex flex-col items-center gap-0.5">
        <p className="text-xs text-gray-400 text-center">
          {isFront ? 'Front' : 'Back'} · {color} · {artUrl ? `${artW}″ × ${artH}″ DTF` : 'no artwork for this side'}
        </p>
        {artUrl && (
          <p className="flex items-center gap-1 text-[11px] text-gray-300">
            <Move className="h-3 w-3" /> Drag to reposition
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

interface ShirtMockupCardProps {
  config: any
  orderFiles?: Array<{ file_type: string; storage_path: string }>
  orderId?: string
  className?: string
}

const SHIRT_STYLE_LABELS: Record<string, string> = {
  tshirt: 'T-Shirt', longsleeve: 'Long Sleeve', crewneck: 'Crewneck',
  hoodie: 'Hoodie', ziphoodie: 'Zip Hoodie',
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

function filePublicUrl(storagePath: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/order-files/${storagePath}`
}

export function ShirtMockupCard({ config, orderFiles = [], orderId, className = '' }: ShirtMockupCardProps) {
  const normalized   = normalizeShirtConfig(config)
  const colorGroups: any[] = normalized.color_groups ?? []
  const colors       = colorGroups.map((g: any) => g.color).filter(Boolean)

  const styleGroups: any[] = config?.style_groups ?? []
  let shirtStyle: string = config?.shirt_style ?? 'tshirt'
  if (styleGroups.length > 0) {
    let maxQty = 0
    for (const sg of styleGroups) {
      const qty = (sg.color_groups ?? [])
        .flatMap((g: any) => g.sizes ?? [])
        .reduce((s: number, sz: any) => s + (sz.quantity ?? 0), 0)
      if (qty > maxQty) { maxQty = qty; shirtStyle = sg.shirt_style }
    }
  }

  const frontFile = orderFiles.find(f => f.file_type === 'front_artwork')
  const backFile  = orderFiles.find(f => f.file_type === 'back_artwork')
  const frontArtworkUrl = config?.front_file_url ?? (frontFile ? filePublicUrl(frontFile.storage_path) : null)
  const backArtworkUrl  = config?.back_file_url  ?? (backFile  ? filePublicUrl(backFile.storage_path)  : null)

  const savedOffsets = config?.artwork_offsets ?? {}
  const initialFront = savedOffsets.front ?? { x: 0, y: 0, scale: 1 }
  const initialBack  = savedOffsets.back  ?? { x: 0, y: 0, scale: 1 }

  const [selectedColor, setSelectedColor] = useState(colors[0] ?? 'White')

  async function handleSave(
    frontOffset: { x: number; y: number; scale: number },
    backOffset:  { x: number; y: number; scale: number },
  ) {
    if (!orderId) return
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        configuration: { ...config, artwork_offsets: { front: frontOffset, back: backOffset } },
      }),
    })
  }

  return (
    <div className={className}>
      {colors.length > 1 && (
        <div className="mb-3 flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Preview colour</label>
          <select value={selectedColor} onChange={e => setSelectedColor(e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs"
          >
            {colors.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      )}

      {styleGroups.length > 1 && (
        <p className="mb-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
          Multi-style — showing {SHIRT_STYLE_LABELS[shirtStyle] ?? shirtStyle} (dominant qty)
        </p>
      )}

      <ShirtMockup
        shirtStyle={shirtStyle}
        color={selectedColor}
        frontArtworkUrl={frontArtworkUrl}
        backArtworkUrl={backArtworkUrl}
        dtfFrontWidth={config?.dtf_front_width}
        dtfFrontHeight={config?.dtf_front_height}
        dtfBackWidth={config?.dtf_back_width}
        dtfBackHeight={config?.dtf_back_height}
        initialFrontOffset={initialFront}
        initialBackOffset={initialBack}
        onSave={orderId ? handleSave : undefined}
      />
    </div>
  )
}
