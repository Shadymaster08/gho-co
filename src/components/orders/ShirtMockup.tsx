'use client'

import { getColorHex } from '@/lib/supplier/fabrik-catalog'
import { normalizeShirtConfig } from '@/lib/pricing'
import { useState, useId, useRef, useEffect } from 'react'
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

const PX_PER_IN = 10

type ShapeConfig = { body: string; collar: string; artCenterY: number }

// All garment silhouettes use viewBox "0 0 300 360".
// Crewneck, hoodie, and ziphoodie have full-length sleeves tapering to wrist.
const SHAPES: Record<string, ShapeConfig> = {
  tshirt: {
    body: 'M 118,42 Q 150,20 182,42 L 230,58 L 280,82 L 278,120 L 238,130 L 238,338 L 62,338 L 62,130 L 22,120 L 20,82 L 70,58 Z',
    collar: 'M 118,42 Q 150,20 182,42 Q 178,70 150,72 Q 122,70 118,42 Z',
    artCenterY: 200,
  },
  longsleeve: {
    body: 'M 118,42 Q 150,20 182,42 L 230,58 L 270,80 L 284,310 L 254,316 L 238,130 L 62,130 L 46,316 L 16,310 L 30,80 L 70,58 Z',
    collar: 'M 118,42 Q 150,20 182,42 Q 178,70 150,72 Q 122,70 118,42 Z',
    artCenterY: 200,
  },
  crewneck: {
    // Wide crew collar, long sleeves
    body: 'M 108,56 Q 150,30 192,56 L 234,72 L 272,94 L 284,308 L 254,314 L 238,144 L 62,144 L 46,314 L 16,308 L 28,94 L 66,72 Z',
    collar: 'M 108,56 Q 150,30 192,56 Q 188,86 150,88 Q 112,86 108,56 Z',
    artCenterY: 212,
  },
  hoodie: {
    // Hood rises from shoulders; long sleeves tapering to wrist; kangaroo pocket rendered separately
    body: 'M 112,62 Q 82,30 60,14 Q 96,4 150,4 Q 204,4 240,14 Q 218,30 188,62 L 234,76 L 272,98 L 284,316 L 254,322 L 238,150 L 62,150 L 46,322 L 16,316 L 28,98 L 66,76 Z',
    collar: 'M 112,62 Q 150,44 188,62 Q 184,90 150,92 Q 116,90 112,62 Z',
    artCenterY: 205,
  },
  ziphoodie: {
    body: 'M 112,62 Q 82,30 60,14 Q 96,4 150,4 Q 204,4 240,14 Q 218,30 188,62 L 234,76 L 272,98 L 284,316 L 254,322 L 238,150 L 62,150 L 46,322 L 16,316 L 28,98 L 66,76 Z',
    collar: 'M 112,62 Q 130,48 148,48 L 152,48 Q 170,48 188,62 Q 184,90 152,92 L 148,92 Q 116,90 112,62 Z',
    artCenterY: 205,
  },
}

function isLight(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

function adjustBrightness(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const a = (v: number) => Math.min(255, Math.max(0, Math.round(v * factor)))
  return `rgb(${a(r)},${a(g)},${a(b)})`
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
  const uid = useId().replace(/:/g, '')
  const svgRef = useRef<SVGSVGElement>(null)

  const [side, setSide] = useState<'front' | 'back'>('front')
  const [frontOffset, setFrontOffset] = useState({ x: 0, y: 0 })
  const [backOffset, setBackOffset] = useState({ x: 0, y: 0 })

  // Refs so event handlers never capture stale closures
  const draggingRef = useRef(false)
  const sideRef = useRef<'front' | 'back'>('front')
  const frontOffRef = useRef({ x: 0, y: 0 })
  const backOffRef = useRef({ x: 0, y: 0 })
  const dragAnchor = useRef({ svgX: 0, svgY: 0, offX: 0, offY: 0 })

  useEffect(() => { sideRef.current = side }, [side])
  useEffect(() => { frontOffRef.current = frontOffset }, [frontOffset])
  useEffect(() => { backOffRef.current = backOffset }, [backOffset])

  function toSVGCoords(clientX: number, clientY: number) {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = clientX; pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const r = pt.matrixTransform(ctm.inverse())
    return { x: r.x, y: r.y }
  }

  function startDrag(clientX: number, clientY: number) {
    draggingRef.current = true
    const { x, y } = toSVGCoords(clientX, clientY)
    const off = sideRef.current === 'front' ? frontOffRef.current : backOffRef.current
    dragAnchor.current = { svgX: x, svgY: y, offX: off.x, offY: off.y }
  }

  // Global listeners attached once — access everything via refs
  useEffect(() => {
    function move(clientX: number, clientY: number) {
      if (!draggingRef.current) return
      const { x, y } = toSVGCoords(clientX, clientY)
      const newOff = {
        x: dragAnchor.current.offX + (x - dragAnchor.current.svgX),
        y: dragAnchor.current.offY + (y - dragAnchor.current.svgY),
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

  const shape = SHAPES[shirtStyle] ?? SHAPES.tshirt
  const hex = getColorHex(color) ?? '#d0d0d0'
  const light = isLight(hex)

  const isFront = side === 'front'
  const hasBothSides = !!(frontArtworkUrl && backArtworkUrl)
  const artUrl = isFront ? frontArtworkUrl : backArtworkUrl
  const artW = Number((isFront ? dtfFrontWidth : dtfBackWidth) ?? 12)
  const artH = Number((isFront ? dtfFrontHeight : dtfBackHeight) ?? 12)
  const offset = isFront ? frontOffset : backOffset
  const isOffsetZero = offset.x === 0 && offset.y === 0

  const svgArtW = artW * PX_PER_IN
  const svgArtH = artH * PX_PER_IN
  // Base position: horizontally centered, vertically at chest center
  const baseX = 150 - svgArtW / 2
  const baseY = shape.artCenterY - svgArtH / 2
  const artX = baseX + offset.x
  const artY = baseY + offset.y

  const collarFill = adjustBrightness(hex, light ? 0.78 : 1.35)
  const outlineColor = light ? '#b8b8b8' : adjustBrightness(hex, 0.55)
  const hasInteractiveArtwork = !!(artUrl)

  return (
    <div className={`flex flex-col items-center gap-2 select-none ${className}`}>
      {/* Controls row */}
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
            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-500 hover:text-gray-800"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 300 360"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-[260px]"
        style={{ filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.18))' }}
      >
        <defs>
          {/* Clip shading/collar to shirt outline only */}
          <clipPath id={`sc-${uid}`}>
            <path d={shape.body} />
          </clipPath>
          <linearGradient id={`gh-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#000" stopOpacity="0.09" />
            <stop offset="18%" stopColor="#000" stopOpacity="0" />
            <stop offset="82%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.09" />
          </linearGradient>
          <linearGradient id={`gv-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="65%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.07" />
          </linearGradient>
        </defs>

        {/* 1 — Shirt body fill */}
        <path d={shape.body} fill={hex} />

        {/* 2 — Artwork (NOT clipped — user can drag freely; shading overlays on top give depth) */}
        {artUrl ? (
          <image
            href={artUrl}
            x={artX} y={artY}
            width={svgArtW} height={svgArtH}
            preserveAspectRatio="xMidYMid meet"
            style={{ cursor: draggingRef.current ? 'grabbing' : 'grab' }}
            onMouseDown={e => { e.preventDefault(); startDrag(e.clientX, e.clientY) }}
            onTouchStart={e => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY) }}
          />
        ) : (
          // Placeholder: dashed outline showing print area
          <g>
            <rect
              x={artX} y={artY}
              width={svgArtW} height={svgArtH}
              fill="none"
              stroke={light ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.25)'}
              strokeWidth="1"
              strokeDasharray="5 3"
              rx="2"
            />
            <text
              x={150 + offset.x} y={shape.artCenterY + offset.y}
              textAnchor="middle" dominantBaseline="middle"
              fill={light ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.38)'}
              fontSize="9"
              fontFamily="system-ui, sans-serif"
            >
              {artW}″ × {artH}″
            </text>
          </g>
        )}

        {/* Subtle artwork border (visible even when outside shirt) */}
        {artUrl && (
          <rect
            x={artX} y={artY}
            width={svgArtW} height={svgArtH}
            fill="none"
            stroke={light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.18)'}
            strokeWidth="0.6"
            strokeDasharray="4 3"
            rx="1"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* 3 — Shading overlays clipped to shirt body (drape effect over artwork) */}
        <g clipPath={`url(#sc-${uid})`}>
          <path d={shape.body} fill={`url(#gh-${uid})`} />
          <path d={shape.body} fill={`url(#gv-${uid})`} />
        </g>

        {/* 4 — Collar */}
        <path d={shape.collar} fill={collarFill} />

        {/* 5 — Kangaroo pocket (hoodie / ziphoodie) */}
        {(shirtStyle === 'hoodie' || shirtStyle === 'ziphoodie') && (
          <rect
            x={104} y={250} width={92} height={56} rx={10}
            fill={adjustBrightness(hex, light ? 0.88 : 1.18)}
            stroke={adjustBrightness(hex, light ? 0.78 : 1.35)}
            strokeWidth="0.8"
          />
        )}

        {/* 6 — Zipper */}
        {shirtStyle === 'ziphoodie' && (
          <line
            x1="150" y1="92" x2="150" y2="338"
            stroke={adjustBrightness(hex, light ? 0.6 : 1.55)}
            strokeWidth="1.5"
          />
        )}

        {/* 7 — Outline */}
        <path d={shape.body} fill="none" stroke={outlineColor} strokeWidth="0.8" />
      </svg>

      {/* Info / drag hint */}
      <div className="flex flex-col items-center gap-0.5">
        <p className="text-xs text-gray-400 text-center">
          {isFront ? 'Front' : 'Back'} · {color} · {artUrl ? `${artW}″ × ${artH}″ DTF` : 'no artwork uploaded'}
        </p>
        {hasInteractiveArtwork && (
          <p className="flex items-center gap-1 text-xs text-gray-300">
            <Move className="h-3 w-3" /> Drag to reposition
          </p>
        )}
      </div>
    </div>
  )
}

// ── Card wrapper used in order detail pages ──────────────────────────────────

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

  // Dominant style for multi-style orders
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
          Multi-style order — showing {SHIRT_STYLE_LABELS[shirtStyle] ?? shirtStyle} (dominant qty)
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
