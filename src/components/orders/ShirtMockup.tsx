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

// ─── Garment shapes ─────────────────────────────────────────────────────────
// All use viewBox "0 0 300 360". Cubic beziers throughout for natural curves.
// Crewneck, hoodie, ziphoodie all have full-length tapered sleeves.
// shoulder seams are stored separately for the seam-line overlay.

type ShapeConfig = {
  body: string
  collar: string
  seamR: string   // right shoulder seam path (matches body curve)
  seamL: string   // left shoulder seam path
  artCenterY: number
}

const SHAPES: Record<string, ShapeConfig> = {
  tshirt: {
    body: `M 118,38
      C 130,22 170,22 182,38
      C 200,44 220,52 230,58
      C 250,64 268,72 282,82
      L 282,120
      C 268,128 250,132 238,134
      L 238,338 L 62,338 L 62,134
      C 50,132 32,128 18,120
      L 18,82
      C 32,72 50,64 70,58
      C 80,52 100,44 118,38 Z`,
    collar:
      'M 118,38 C 130,22 170,22 182,38 C 178,64 164,72 150,74 C 136,72 122,64 118,38 Z',
    seamR: 'M 182,38 C 200,44 220,52 230,58',
    seamL: 'M 118,38 C 100,44 80,52 70,58',
    artCenterY: 200,
  },

  longsleeve: {
    body: `M 118,38
      C 130,22 170,22 182,38
      C 200,44 220,52 230,58
      C 250,64 266,72 278,84
      L 286,308 L 256,314 L 238,134
      L 238,338 L 62,338 L 62,134
      L 44,314 L 14,308 L 22,84
      C 34,72 50,64 70,58
      C 80,52 100,44 118,38 Z`,
    collar:
      'M 118,38 C 130,22 170,22 182,38 C 178,64 164,72 150,74 C 136,72 122,64 118,38 Z',
    seamR: 'M 182,38 C 200,44 220,52 230,58',
    seamL: 'M 118,38 C 100,44 80,52 70,58',
    artCenterY: 200,
  },

  crewneck: {
    // Wider, lower crew collar; thick sweatshirt body; long tapered sleeves
    body: `M 108,52
      C 122,30 178,30 192,52
      C 210,58 226,66 236,72
      C 254,78 270,88 280,98
      L 288,308 L 258,314 L 238,152
      L 238,338 L 62,338 L 62,152
      L 42,314 L 12,308 L 20,98
      C 30,88 46,78 64,72
      C 74,66 90,58 108,52 Z`,
    collar:
      'M 108,52 C 122,30 178,30 192,52 C 188,84 164,92 150,94 C 136,92 112,84 108,52 Z',
    seamR: 'M 192,52 C 210,58 226,66 236,72',
    seamL: 'M 108,52 C 90,58 74,66 64,72',
    artCenterY: 215,
  },

  hoodie: {
    // Hood silhouette rises from shoulders; long tapered sleeves; kangaroo pocket rendered separately
    body: `M 112,64
      C 86,38 66,20 62,10
      C 95,2 150,2 205,2
      C 234,12 214,38 188,64
      C 206,70 224,78 234,86
      C 252,92 270,102 280,112
      L 288,318 L 258,324 L 238,154
      L 238,338 L 62,338 L 62,154
      L 42,324 L 12,318 L 20,112
      C 30,102 48,92 66,86
      C 76,78 94,70 112,64 Z`,
    collar:
      'M 112,64 C 128,50 172,50 188,64 C 184,94 164,100 150,102 C 136,100 116,94 112,64 Z',
    seamR: 'M 188,64 C 206,70 224,78 234,86',
    seamL: 'M 112,64 C 94,70 76,78 66,86',
    artCenterY: 215,
  },

  ziphoodie: {
    // Same silhouette as hoodie; V-split collar for zipper
    body: `M 112,64
      C 86,38 66,20 62,10
      C 95,2 150,2 205,2
      C 234,12 214,38 188,64
      C 206,70 224,78 234,86
      C 252,92 270,102 280,112
      L 288,318 L 258,324 L 238,154
      L 238,338 L 62,338 L 62,154
      L 42,324 L 12,318 L 20,112
      C 30,102 48,92 66,86
      C 76,78 94,70 112,64 Z`,
    collar:
      // Narrow split at top for the zipper
      'M 112,64 C 130,50 148,48 150,48 C 152,48 170,50 188,64 C 184,94 152,100 150,100 C 148,100 116,94 112,64 Z',
    seamR: 'M 188,64 C 206,70 224,78 234,86',
    seamL: 'M 112,64 C 94,70 76,78 66,86',
    artCenterY: 215,
  },
}

// ─── Colour helpers ──────────────────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────

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
  const artX = 150 - svgArtW / 2 + offset.x
  const artY = shape.artCenterY - svgArtH / 2 + offset.y

  // Derived colours
  const collarFill  = adjustBrightness(hex, light ? 0.80 : 1.32)
  const seamColor   = adjustBrightness(hex, light ? 0.86 : 1.20)
  const outlineColor = light ? '#b0b0b0' : adjustBrightness(hex, 0.50)

  const isHoodie = shirtStyle === 'hoodie' || shirtStyle === 'ziphoodie'

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

      <svg
        ref={svgRef}
        viewBox="0 0 300 360"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-[260px] select-none"
        style={{ filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.22))' }}
      >
        <defs>
          <clipPath id={`sc-${uid}`}>
            <path d={shape.body} />
          </clipPath>

          {/* Studio-light radial: soft highlight upper-left, shadow edges */}
          <radialGradient id={`rl-${uid}`} cx="38%" cy="28%" r="68%" gradientUnits="objectBoundingBox">
            <stop offset="0%"   stopColor="#fff" stopOpacity="0.07" />
            <stop offset="55%"  stopColor="#000" stopOpacity="0"    />
            <stop offset="100%" stopColor="#000" stopOpacity="0.11" />
          </radialGradient>

          {/* Side-edge darkening */}
          <linearGradient id={`se-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#000" stopOpacity="0.08" />
            <stop offset="16%"  stopColor="#000" stopOpacity="0"    />
            <stop offset="84%"  stopColor="#000" stopOpacity="0"    />
            <stop offset="100%" stopColor="#000" stopOpacity="0.08" />
          </linearGradient>

          {/* Bottom-hem fade */}
          <linearGradient id={`bf-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="72%"  stopColor="#000" stopOpacity="0"    />
            <stop offset="100%" stopColor="#000" stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {/* ① Shirt body fill */}
        <path d={shape.body} fill={hex} />

        {/* ② Artwork — draggable, not clipped (shading drapes over it) */}
        {artUrl ? (
          <image
            href={artUrl}
            x={artX} y={artY}
            width={svgArtW} height={svgArtH}
            preserveAspectRatio="xMidYMid meet"
            style={{ cursor: 'grab' }}
            onMouseDown={e => { e.preventDefault(); startDrag(e.clientX, e.clientY) }}
            onTouchStart={e => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY) }}
          />
        ) : (
          // Placeholder: dashed rect + dimensions
          <g>
            <rect
              x={artX} y={artY} width={svgArtW} height={svgArtH}
              fill="none" rx="2"
              stroke={light ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.22)'}
              strokeWidth="1" strokeDasharray="5 3"
            />
            <text
              x={150 + offset.x} y={shape.artCenterY + offset.y}
              textAnchor="middle" dominantBaseline="middle"
              fill={light ? 'rgba(0,0,0,0.26)' : 'rgba(255,255,255,0.36)'}
              fontSize="9" fontFamily="system-ui, sans-serif"
            >
              {artW}″ × {artH}″
            </text>
          </g>
        )}

        {/* Subtle artwork boundary (always visible for drag reference) */}
        {artUrl && (
          <rect
            x={artX} y={artY} width={svgArtW} height={svgArtH}
            fill="none" rx="1"
            stroke={light ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.14)'}
            strokeWidth="0.6" strokeDasharray="4 3"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* ③ Fabric shading — clipped to shirt, rendered on top of artwork */}
        <g clipPath={`url(#sc-${uid})`}>
          <path d={shape.body} fill={`url(#rl-${uid})`} />
          <path d={shape.body} fill={`url(#se-${uid})`} />
          <path d={shape.body} fill={`url(#bf-${uid})`} />
        </g>

        {/* ④ Shoulder seam lines */}
        <path d={shape.seamR} fill="none" stroke={seamColor} strokeWidth="0.7" />
        <path d={shape.seamL} fill="none" stroke={seamColor} strokeWidth="0.7" />

        {/* ⑤ Collar */}
        <path d={shape.collar} fill={collarFill} />

        {/* ⑥ Hoodie/ziphoodie — kangaroo pocket */}
        {isHoodie && (
          <rect
            x={104} y={252} width={92} height={56} rx={10}
            fill={adjustBrightness(hex, light ? 0.90 : 1.15)}
            stroke={seamColor} strokeWidth="0.7"
          />
        )}

        {/* ⑦ Ziphoodie — zipper line */}
        {shirtStyle === 'ziphoodie' && (
          <line
            x1="150" y1="100" x2="150" y2="338"
            stroke={seamColor} strokeWidth="1.2"
          />
        )}

        {/* ⑧ Outline */}
        <path d={shape.body} fill="none" stroke={outlineColor} strokeWidth="0.8" />
      </svg>

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
