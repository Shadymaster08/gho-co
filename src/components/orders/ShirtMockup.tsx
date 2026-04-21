'use client'

import { getColorHex } from '@/lib/supplier/fabrik-catalog'
import { normalizeShirtConfig } from '@/lib/pricing'
import { useState, useRef, useEffect } from 'react'
import { RotateCcw, Move } from 'lucide-react'

export interface ShirtMockupProps {
  shirtStyle?: string
  color?: string
  frontArtworkUrl?: string | null
  backArtworkUrl?: string | null
  dtfFrontWidth?: number | null
  dtfFrontHeight?: number | null
  dtfBackWidth?: number | null
  dtfBackHeight?: number | null
  className?: string
}

// Template images are 307 × 450 px.
// PX_PER_INCH: DTF inches → template pixel units for artwork sizing.
const TEMPLATE_W = 307
const TEMPLATE_H = 450
const PX_PER_INCH = 10

const TEMPLATE_META: Record<string, { frontCenterY: number; backCenterY: number }> = {
  tshirt:     { frontCenterY: 185, backCenterY: 175 },
  longsleeve: { frontCenterY: 185, backCenterY: 175 },
  crewneck:   { frontCenterY: 195, backCenterY: 178 },
  hoodie:     { frontCenterY: 210, backCenterY: 178 },
  ziphoodie:  { frontCenterY: 210, backCenterY: 178 },
}

function isLight(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 128
}

export function ShirtMockup({
  shirtStyle = 'tshirt',
  color = 'White',
  frontArtworkUrl,
  backArtworkUrl,
  dtfFrontWidth = 12,
  dtfFrontHeight = 12,
  dtfBackWidth,
  dtfBackHeight,
  className = '',
}: ShirtMockupProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const [side, setSide] = useState<'front' | 'back'>('front')
  const [frontOffset, setFrontOffset] = useState({ x: 0, y: 0 })
  const [backOffset, setBackOffset] = useState({ x: 0, y: 0 })

  const draggingRef = useRef(false)
  const sideRef = useRef<'front' | 'back'>('front')
  const frontOffRef = useRef({ x: 0, y: 0 })
  const backOffRef = useRef({ x: 0, y: 0 })
  const dragAnchor = useRef({ tmplX: 0, tmplY: 0, offX: 0, offY: 0 })

  useEffect(() => { sideRef.current = side }, [side])
  useEffect(() => { frontOffRef.current = frontOffset }, [frontOffset])
  useEffect(() => { backOffRef.current = backOffset }, [backOffset])

  // Convert screen px → template coordinate space (0–307, 0–450)
  function toTemplateCoords(clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: ((clientX - rect.left) / rect.width) * TEMPLATE_W,
      y: ((clientY - rect.top) / rect.height) * TEMPLATE_H,
    }
  }

  function startDrag(clientX: number, clientY: number) {
    draggingRef.current = true
    const { x, y } = toTemplateCoords(clientX, clientY)
    const off = sideRef.current === 'front' ? frontOffRef.current : backOffRef.current
    dragAnchor.current = { tmplX: x, tmplY: y, offX: off.x, offY: off.y }
  }

  useEffect(() => {
    function move(clientX: number, clientY: number) {
      if (!draggingRef.current) return
      const { x, y } = toTemplateCoords(clientX, clientY)
      const newOff = {
        x: dragAnchor.current.offX + (x - dragAnchor.current.tmplX),
        y: dragAnchor.current.offY + (y - dragAnchor.current.tmplY),
      }
      if (sideRef.current === 'front') setFrontOffset(newOff)
      else setBackOffset(newOff)
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const hex = getColorHex(color) ?? '#d0d0d0'
  const meta = TEMPLATE_META[shirtStyle] ?? TEMPLATE_META.tshirt
  const light = isLight(hex)

  const isFront = side === 'front'
  const hasBothSides = !!(frontArtworkUrl && backArtworkUrl)
  const artUrl = isFront ? frontArtworkUrl : backArtworkUrl
  const artW = Number((isFront ? dtfFrontWidth : dtfBackWidth) ?? 12)
  const artH = Number((isFront ? dtfFrontHeight : dtfBackHeight) ?? 12)
  const offset = isFront ? frontOffset : backOffset
  const isOffsetZero = offset.x === 0 && offset.y === 0

  const artPxW = artW * PX_PER_INCH
  const artPxH = artH * PX_PER_INCH
  const centerY = isFront ? meta.frontCenterY : meta.backCenterY
  const artX = TEMPLATE_W / 2 - artPxW / 2 + offset.x
  const artY = centerY - artPxH / 2 + offset.y

  // Convert template-px positions to CSS percentages for absolute positioning
  const artLeftPct = (artX / TEMPLATE_W) * 100
  const artTopPct  = (artY / TEMPLATE_H) * 100
  const artWPct    = (artPxW / TEMPLATE_W) * 100
  const artHPct    = (artPxH / TEMPLATE_H) * 100

  const templateSrc = `/mockup-templates/${shirtStyle}-${side}.png`
  const borderColor = light ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.40)'
  const placeholderFill = light ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.55)'

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* Controls */}
      <div className="flex items-center gap-2">
        {hasBothSides && (
          <div className="flex overflow-hidden rounded-lg border border-gray-200 text-xs">
            {(['front', 'back'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSide(s)}
                className={`px-3 py-1.5 font-medium capitalize transition-colors ${
                  side === s ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {!isOffsetZero && (
          <button
            type="button"
            onClick={() => isFront ? setFrontOffset({ x: 0, y: 0 }) : setBackOffset({ x: 0, y: 0 })}
            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        )}
      </div>

      {/* Mockup container — CSS blend-mode stack */}
      <div
        ref={containerRef}
        className="relative w-full max-w-[260px] select-none overflow-hidden rounded-sm"
        style={{ isolation: 'isolate' }}
      >
        {/* Layer 1: Photo template */}
        <img
          src={templateSrc}
          alt={`${shirtStyle} ${side}`}
          className="block w-full"
          draggable={false}
        />

        {/* Layer 2: Shirt color via multiply blend
            white template × shirt color = shirt color */}
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundColor: hex,
            mixBlendMode: 'multiply',
          }}
        />

        {/* Layer 3: Artwork — plain HTML img for reliable cross-origin rendering */}
        {artUrl && (
          <img
            src={artUrl}
            draggable={false}
            style={{
              position: 'absolute',
              left: `${artLeftPct}%`,
              top: `${artTopPct}%`,
              width: `${artWPct}%`,
              height: `${artHPct}%`,
              objectFit: 'contain',
              cursor: 'grab',
            }}
            onMouseDown={e => { e.preventDefault(); startDrag(e.clientX, e.clientY) }}
            onTouchStart={e => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY) }}
          />
        )}

        {/* Layer 3 (no artwork): dashed placeholder box */}
        {!artUrl && (
          <svg
            viewBox={`0 0 ${TEMPLATE_W} ${TEMPLATE_H}`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          >
            <rect
              x={artX} y={artY} width={artPxW} height={artPxH}
              fill="none" rx="2"
              stroke={borderColor} strokeWidth="1" strokeDasharray="5 3"
            />
            <text
              x={artX + artPxW / 2} y={artY + artPxH / 2}
              textAnchor="middle" dominantBaseline="middle"
              fill={placeholderFill} fontSize="9" fontFamily="system-ui, sans-serif"
            >
              {artW}″ × {artH}″
            </text>
          </svg>
        )}

        {/* Layer 4: Template re-drawn at 22% multiply — adds fabric depth over artwork */}
        <img
          src={templateSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            mixBlendMode: 'multiply',
            opacity: 0.22,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Caption */}
      <div className="flex flex-col items-center gap-0.5">
        <p className="text-xs text-gray-400 text-center">
          {isFront ? 'Front' : 'Back'} · {color} · {artUrl ? `${artW}″ × ${artH}″ DTF` : 'no artwork uploaded'}
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
  className?: string
}

const SHIRT_STYLE_LABELS: Record<string, string> = {
  tshirt: 'T-Shirt', longsleeve: 'Long Sleeve', crewneck: 'Crewneck',
  hoodie: 'Hoodie', ziphoodie: 'Zip Hoodie',
}

export function ShirtMockupCard({ config, className = '' }: ShirtMockupCardProps) {
  const normalized = normalizeShirtConfig(config)
  const colorGroups: any[] = normalized.color_groups ?? []
  const colors = colorGroups.map((g: any) => g.color).filter(Boolean)

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

  const [selectedColor, setSelectedColor] = useState(colors[0] ?? 'White')

  return (
    <div className={className}>
      {colors.length > 1 && (
        <div className="mb-3 flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Preview colour</label>
          <select
            value={selectedColor}
            onChange={e => setSelectedColor(e.target.value)}
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
        frontArtworkUrl={config?.front_file_url}
        backArtworkUrl={config?.back_file_url}
        dtfFrontWidth={config?.dtf_front_width}
        dtfFrontHeight={config?.dtf_front_height}
        dtfBackWidth={config?.dtf_back_width}
        dtfBackHeight={config?.dtf_back_height}
      />
    </div>
  )
}
