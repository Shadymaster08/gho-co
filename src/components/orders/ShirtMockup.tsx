'use client'

import { getColorHex } from '@/lib/supplier/fabrik-catalog'
import { normalizeShirtConfig } from '@/lib/pricing'
import { useState, useId } from 'react'

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
    body: 'M 110,52 Q 150,28 190,52 L 234,68 L 278,92 L 276,132 L 238,142 L 238,338 L 62,338 L 62,142 L 24,132 L 22,92 L 66,68 Z',
    collar: 'M 110,52 Q 150,28 190,52 Q 186,82 150,84 Q 114,82 110,52 Z',
    artCenterY: 205,
  },
  hoodie: {
    body: 'M 112,62 Q 82,30 60,14 Q 96,4 150,4 Q 204,4 240,14 Q 218,30 188,62 L 234,76 L 278,100 L 276,140 L 238,150 L 238,338 L 62,338 L 62,150 L 24,140 L 22,100 L 66,76 Z',
    collar: 'M 112,62 Q 150,44 188,62 Q 184,90 150,92 Q 116,90 112,62 Z',
    artCenterY: 200,
  },
  ziphoodie: {
    body: 'M 112,62 Q 82,30 60,14 Q 96,4 150,4 Q 204,4 240,14 Q 218,30 188,62 L 234,76 L 278,100 L 276,140 L 238,150 L 238,338 L 62,338 L 62,150 L 24,140 L 22,100 L 66,76 Z',
    collar: 'M 112,62 Q 130,48 148,48 L 152,48 Q 170,48 188,62 Q 184,90 152,92 L 148,92 Q 116,90 112,62 Z',
    artCenterY: 200,
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
  const [side, setSide] = useState<'front' | 'back'>('front')

  const shape = SHAPES[shirtStyle] ?? SHAPES.tshirt
  const hex = getColorHex(color) ?? '#d0d0d0'
  const light = isLight(hex)

  const isFront = side === 'front'
  const hasBothSides = !!(frontArtworkUrl && backArtworkUrl)
  const artUrl = isFront ? frontArtworkUrl : backArtworkUrl
  const artW = Number((isFront ? dtfFrontWidth : dtfBackWidth) ?? 12)
  const artH = Number((isFront ? dtfFrontHeight : dtfBackHeight) ?? 12)

  const svgArtW = artW * PX_PER_IN
  const svgArtH = artH * PX_PER_IN
  const artX = 150 - svgArtW / 2
  const artY = shape.artCenterY - svgArtH / 2

  const collarFill = adjustBrightness(hex, light ? 0.78 : 1.35)
  const outlineColor = light ? '#b8b8b8' : adjustBrightness(hex, 0.55)

  return (
    <div className={`flex flex-col items-center gap-2 select-none ${className}`}>
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

      <svg
        viewBox="0 0 300 360"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-[260px]"
        style={{ filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.18))' }}
      >
        <defs>
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

        {/* Shirt body */}
        <path d={shape.body} fill={hex} />

        {/* Artwork or placeholder */}
        <g clipPath={`url(#sc-${uid})`}>
          {artUrl ? (
            <image
              href={artUrl}
              x={artX} y={artY}
              width={svgArtW} height={svgArtH}
              preserveAspectRatio="xMidYMid meet"
            />
          ) : (
            <>
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
                x={150} y={shape.artCenterY}
                textAnchor="middle" dominantBaseline="middle"
                fill={light ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.38)'}
                fontSize="9"
                fontFamily="system-ui, sans-serif"
              >
                {artW}″ × {artH}″
              </text>
            </>
          )}
        </g>

        {/* Shading overlays */}
        <path d={shape.body} fill={`url(#gh-${uid})`} />
        <path d={shape.body} fill={`url(#gv-${uid})`} />

        {/* Collar */}
        <path d={shape.collar} fill={collarFill} />

        {/* Kangaroo pocket */}
        {(shirtStyle === 'hoodie' || shirtStyle === 'ziphoodie') && (
          <rect
            x={104} y={250} width={92} height={54} rx={10}
            fill={adjustBrightness(hex, light ? 0.88 : 1.18)}
            stroke={adjustBrightness(hex, light ? 0.78 : 1.35)}
            strokeWidth="0.8"
          />
        )}

        {/* Zipper */}
        {shirtStyle === 'ziphoodie' && (
          <line
            x1="150" y1="92" x2="150" y2="338"
            stroke={adjustBrightness(hex, light ? 0.6 : 1.55)}
            strokeWidth="1.5"
          />
        )}

        {/* Outline */}
        <path d={shape.body} fill="none" stroke={outlineColor} strokeWidth="0.8" />
      </svg>

      <p className="text-xs text-gray-400 text-center">
        {isFront ? 'Front' : 'Back'} · {color} · {artUrl ? `${artW}″ × ${artH}″ DTF` : 'no artwork uploaded'}
      </p>
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
          Multi-style order — showing dominant style ({SHIRT_STYLE_LABELS[shirtStyle] ?? shirtStyle})
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
