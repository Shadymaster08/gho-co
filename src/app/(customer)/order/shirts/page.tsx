'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { FileDropzone } from '@/components/ui/FileDropzone'
import { useUpload } from '@/hooks/useUpload'
import { BillingSection } from '@/components/orders/BillingSection'
import type { ShirtStyle, BillingData } from '@/types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function isLight(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 170
}

// ─── Product catalogue ───────────────────────────────────────────────────────

type Color = { name: string; hex: string }
type ProductDef = {
  label: string
  sublabel: string
  sku: string
  sizes: readonly string[]
  colors: Color[]
}

const PRODUCTS: Record<ShirtStyle, ProductDef> = {
  tshirt: {
    label: 'T-Shirt',
    sublabel: 'Heavy Cotton™ T-Shirt',
    sku: 'G5000',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: [
      { name: 'White', hex: '#ffffff' },
      { name: 'Natural', hex: '#fffede' },
      { name: 'Cornsilk', hex: '#f4e7ba' },
      { name: 'Sand', hex: '#f1e7c8' },
      { name: 'Ash', hex: '#d7d7d7' },
      { name: 'Ice Grey', hex: '#bdbecf' },
      { name: 'Sport Grey', hex: '#bbbcc8' },
      { name: 'Gravel', hex: '#86817e' },
      { name: 'Graphite Heather', hex: '#474a51' },
      { name: 'Tweed', hex: '#616469' },
      { name: 'Dark Heather', hex: '#3f4444' },
      { name: 'Charcoal', hex: '#36454f' },
      { name: 'Black', hex: '#000000' },
      { name: 'Midnight', hex: '#334b57' },
      { name: 'Heather Navy', hex: '#31394c' },
      { name: 'Indigo Blue', hex: '#34657f' },
      { name: 'Navy', hex: '#000080' },
      { name: 'Tropical Blue', hex: '#009acd' },
      { name: 'Antique Sapphire', hex: '#0f52ba' },
      { name: 'Sapphire', hex: '#0f52ba' },
      { name: 'Cobalt', hex: '#0047ab' },
      { name: 'Heather Sapphire', hex: '#3299d4' },
      { name: 'Royal', hex: '#4169e1' },
      { name: 'Neon Blue', hex: '#1b03a3' },
      { name: 'Sky', hex: '#92c3e1' },
      { name: 'Carolina Blue', hex: '#7ba4db' },
      { name: 'Light Blue', hex: '#add8e6' },
      { name: 'Red', hex: '#ff0000' },
      { name: 'Heather Red', hex: '#cb2e35' },
      { name: 'Cardinal', hex: '#c41e3a' },
      { name: 'Antique Cherry Red', hex: '#971b2f' },
      { name: 'Garnet', hex: '#8b0000' },
      { name: 'Maroon', hex: '#752936' },
      { name: 'Berry', hex: '#b4236a' },
      { name: 'Heliconia', hex: '#db3e79' },
      { name: 'Safety Pink', hex: '#e16f8f' },
      { name: 'Azalea', hex: '#e387b4' },
      { name: 'Coral Silk', hex: '#ff777f' },
      { name: 'Light Pink', hex: '#ffb6c1' },
      { name: 'Heather Radiant Orchid', hex: '#d198c4' },
      { name: 'Lilac', hex: '#dcb8e7' },
      { name: 'Violet', hex: '#6a2a5b' },
      { name: 'Blackberry', hex: '#382035' },
      { name: 'Purple', hex: '#4c4084' },
      { name: 'Tennessee Orange', hex: '#eb9501' },
      { name: 'Antique Orange', hex: '#fc7154' },
      { name: 'Orange', hex: '#f4633a' },
      { name: 'Texas Orange', hex: '#b65a30' },
      { name: 'Sunset', hex: '#c45c3d' },
      { name: 'Safety Orange', hex: '#ff6700' },
      { name: 'Old Gold', hex: '#dcae96' },
      { name: 'Gold', hex: '#ffd700' },
      { name: 'Daisy', hex: '#ffed67' },
      { name: 'Yellow Haze', hex: '#eee8a0' },
      { name: 'Kiwi', hex: '#8aa140' },
      { name: 'Safety Green', hex: '#e6fd6b' },
      { name: 'Electric Green', hex: '#00ff00' },
      { name: 'Neon Green', hex: '#39ff14' },
      { name: 'Lime', hex: '#a6e97a' },
      { name: 'Turf Green', hex: '#7cfc00' },
      { name: 'Mint Green', hex: '#c3d9bc' },
      { name: 'Irish Green', hex: '#3cc178' },
      { name: 'Antique Jade Dome', hex: '#006269' },
      { name: 'Antique Irish Green', hex: '#00843d' },
      { name: 'Forest Green', hex: '#254117' },
      { name: 'Heather Military Green', hex: '#7e7f74' },
      { name: 'Military Green', hex: '#646650' },
      { name: 'Dark Chocolate', hex: '#665542' },
      { name: 'Brown Savana', hex: '#9f877b' },
    ],
  },

  longsleeve: {
    label: 'Long Sleeve',
    sublabel: 'Heavy Cotton™ Long Sleeve T-Shirt',
    sku: 'G5400',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: [
      { name: 'White', hex: '#ffffff' },
      { name: 'Ash', hex: '#d7d7d7' },
      { name: 'Sport Grey', hex: '#bbbcc8' },
      { name: 'Graphite Heather', hex: '#474a51' },
      { name: 'Black', hex: '#000000' },
      { name: 'Navy', hex: '#000080' },
      { name: 'Royal', hex: '#4169e1' },
      { name: 'Carolina Blue', hex: '#7ba4db' },
      { name: 'Red', hex: '#ff0000' },
      { name: 'Cardinal Red', hex: '#c03545' },
      { name: 'Garnet', hex: '#8b0000' },
      { name: 'Maroon', hex: '#752936' },
      { name: 'Purple', hex: '#4c4084' },
      { name: 'Orange', hex: '#f4633a' },
      { name: 'Gold', hex: '#ffd700' },
      { name: 'Safety Green', hex: '#e6fd6b' },
      { name: 'Safety Orange', hex: '#ff6700' },
      { name: 'Irish Green', hex: '#3cc178' },
      { name: 'Forest', hex: '#273b33' },
      { name: 'Military Green', hex: '#646650' },
    ],
  },

  crewneck: {
    label: 'Crewneck',
    sublabel: 'Heavy Blend™ Crewneck Sweatshirt',
    sku: 'G18000',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: [
      { name: 'White', hex: '#ffffff' },
      { name: 'Sand', hex: '#f1e7c8' },
      { name: 'Ash', hex: '#d7d7d7' },
      { name: 'Light Pink', hex: '#ffb6c1' },
      { name: 'Sport Grey', hex: '#bbbcc8' },
      { name: 'Light Blue', hex: '#add8e6' },
      { name: 'Graphite Heather', hex: '#474a51' },
      { name: 'Dark Heather', hex: '#3f4444' },
      { name: 'Charcoal', hex: '#36454f' },
      { name: 'Black', hex: '#000000' },
      { name: 'Indigo Blue', hex: '#34657f' },
      { name: 'Navy', hex: '#000080' },
      { name: 'Heather Deep Royal', hex: '#1d4f91' },
      { name: 'Sapphire', hex: '#0f52ba' },
      { name: 'Royal', hex: '#4169e1' },
      { name: 'Carolina Blue', hex: '#7ba4db' },
      { name: 'Red', hex: '#ff0000' },
      { name: 'Heather Sport Scarlet Red', hex: '#b83a4b' },
      { name: 'Cherry Red', hex: '#d30037' },
      { name: 'Cardinal Red', hex: '#c03545' },
      { name: 'Garnet', hex: '#8b0000' },
      { name: 'Heather Sport Dark Maroon', hex: '#651d32' },
      { name: 'Maroon', hex: '#752936' },
      { name: 'Heliconia', hex: '#db3e79' },
      { name: 'Safety Pink', hex: '#e16f8f' },
      { name: 'Purple', hex: '#4c4084' },
      { name: 'Orange', hex: '#f4633a' },
      { name: 'Gold', hex: '#ffd700' },
      { name: 'Safety Green', hex: '#e6fd6b' },
      { name: 'Safety Orange', hex: '#ff6700' },
      { name: 'Irish Green', hex: '#3cc178' },
      { name: 'Forest', hex: '#273b33' },
      { name: 'Military Green', hex: '#646650' },
      { name: 'Dark Chocolate', hex: '#665542' },
    ],
  },

  hoodie: {
    label: 'Hoodie',
    sublabel: 'Heavy Blend™ Hooded Sweatshirt',
    sku: 'G18500',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: [
      { name: 'White', hex: '#ffffff' },
      { name: 'Sand', hex: '#f1e7c8' },
      { name: 'Ash', hex: '#d7d7d7' },
      { name: 'Light Pink', hex: '#ffb6c1' },
      { name: 'Mint Green', hex: '#c3d9bc' },
      { name: 'Sport Grey', hex: '#bbbcc8' },
      { name: 'Light Blue', hex: '#add8e6' },
      { name: 'Orchid', hex: '#e6a8d7' },
      { name: 'Old Gold', hex: '#dcae96' },
      { name: 'Graphite Heather', hex: '#474a51' },
      { name: 'Dark Heather', hex: '#3f4444' },
      { name: 'Charcoal', hex: '#36454f' },
      { name: 'Black', hex: '#000000' },
      { name: 'Indigo Blue', hex: '#34657f' },
      { name: 'Heather Sport Dark Navy', hex: '#595478' },
      { name: 'Navy', hex: '#000080' },
      { name: 'Heather Deep Royal', hex: '#1d4f91' },
      { name: 'Antique Sapphire', hex: '#0f52ba' },
      { name: 'Sapphire', hex: '#0f52ba' },
      { name: 'Royal', hex: '#4169e1' },
      { name: 'Carolina Blue', hex: '#7ba4db' },
      { name: 'Red', hex: '#ff0000' },
      { name: 'Heather Sport Scarlet Red', hex: '#b83a4b' },
      { name: 'Cherry Red', hex: '#d30037' },
      { name: 'Cardinal Red', hex: '#c03545' },
      { name: 'Antique Cherry Red', hex: '#971b2f' },
      { name: 'Garnet', hex: '#8b0000' },
      { name: 'Heather Sport Dark Maroon', hex: '#651d32' },
      { name: 'Maroon', hex: '#752936' },
      { name: 'Heliconia', hex: '#db3e79' },
      { name: 'Safety Pink', hex: '#e16f8f' },
      { name: 'Azalea', hex: '#e387b4' },
      { name: 'Violet', hex: '#6a2a5b' },
      { name: 'Purple', hex: '#4c4084' },
      { name: 'Orange', hex: '#f4633a' },
      { name: 'Gold', hex: '#ffd700' },
      { name: 'Safety Green', hex: '#e6fd6b' },
      { name: 'Safety Orange', hex: '#ff6700' },
      { name: 'Irish Green', hex: '#3cc178' },
      { name: 'Heather Sport Dark Green', hex: '#43695b' },
      { name: 'Forest', hex: '#273b33' },
      { name: 'Military Green', hex: '#646650' },
      { name: 'Dark Chocolate', hex: '#665542' },
    ],
  },

  ziphoodie: {
    label: 'Zip Hoodie',
    sublabel: 'Heavy Blend™ Full-Zip Hooded Sweatshirt',
    sku: 'G18600',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    colors: [
      { name: 'White', hex: '#ffffff' },
      { name: 'Ash', hex: '#d7d7d7' },
      { name: 'Sport Grey', hex: '#bbbcc8' },
      { name: 'Graphite Heather', hex: '#474a51' },
      { name: 'Dark Heather', hex: '#3f4444' },
      { name: 'Black', hex: '#000000' },
      { name: 'Navy', hex: '#000080' },
      { name: 'Royal', hex: '#4169e1' },
      { name: 'Carolina Blue', hex: '#7ba4db' },
      { name: 'Red', hex: '#ff0000' },
      { name: 'Cardinal Red', hex: '#c03545' },
      { name: 'Maroon', hex: '#752936' },
      { name: 'Purple', hex: '#4c4084' },
      { name: 'Forest', hex: '#273b33' },
      { name: 'Safety Green', hex: '#e6fd6b' },
      { name: 'Safety Orange', hex: '#ff6700' },
      { name: 'Dark Chocolate', hex: '#665542' },
    ],
  },
}

// ─── Types ───────────────────────────────────────────────────────────────────

type ColorGroupState = { color: string; quantities: Record<string, number> }
type StyleGroupState = { style: ShirtStyle; colorGroups: ColorGroupState[] }

// ─── Component ───────────────────────────────────────────────────────────────

export default function ShirtsOrderPage() {
  const router = useRouter()

  const [styleGroups, setStyleGroups] = useState<StyleGroupState[]>([
    { style: 'tshirt', colorGroups: [{ color: 'White', quantities: {} }] },
  ])
  const [dtfFrontW, setDtfFrontW] = useState('')
  const [dtfFrontH, setDtfFrontH] = useState('')
  const [dtfBackW, setDtfBackW] = useState('')
  const [dtfBackH, setDtfBackH] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [backFile, setBackFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [billing, setBilling] = useState<BillingData | null>(null)

  const [customOpen, setCustomOpen] = useState(false)
  const [customDesc, setCustomDesc] = useState('')
  const [customLoading, setCustomLoading] = useState(false)

  const { uploadFile, progress, uploading } = useUpload()
  const newStyleGroupRef = useRef<HTMLDivElement>(null)
  const prevStyleGroupCount = useRef(styleGroups.length)

  useEffect(() => {
    if (styleGroups.length > prevStyleGroupCount.current) {
      newStyleGroupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    prevStyleGroupCount.current = styleGroups.length
  }, [styleGroups.length])

  // ── State helpers ──────────────────────────────────────────────────────────

  function totalQuantity() {
    return styleGroups.reduce((total, sg) =>
      total + sg.colorGroups.reduce((t, g) =>
        t + Object.values(g.quantities).reduce((a, b) => a + b, 0), 0), 0)
  }

  function styleGroupQuantity(sg: StyleGroupState) {
    return sg.colorGroups.reduce((t, g) =>
      t + Object.values(g.quantities).reduce((a, b) => a + b, 0), 0)
  }

  function colorGroupQuantity(g: ColorGroupState) {
    return Object.values(g.quantities).reduce((a, b) => a + b, 0)
  }

  function addStyleGroup() {
    const usedStyles = new Set(styleGroups.map(sg => sg.style))
    const nextStyle = (Object.keys(PRODUCTS) as ShirtStyle[]).find(s => !usedStyles.has(s))
      ?? 'tshirt'
    setStyleGroups(sgs => [...sgs, {
      style: nextStyle,
      colorGroups: [{ color: PRODUCTS[nextStyle].colors[0].name, quantities: {} }],
    }])
  }

  function removeStyleGroup(sgIdx: number) {
    setStyleGroups(sgs => sgs.filter((_, i) => i !== sgIdx))
  }

  function setStyleGroupStyle(sgIdx: number, style: ShirtStyle) {
    setStyleGroups(sgs => sgs.map((sg, i) => {
      if (i !== sgIdx) return sg
      const available = PRODUCTS[style].colors
      return {
        style,
        colorGroups: sg.colorGroups.map(g => ({
          ...g,
          color: available.some(c => c.name === g.color) ? g.color : available[0].name,
          quantities: {},
        })),
      }
    }))
  }

  function addColorGroup(sgIdx: number) {
    setStyleGroups(sgs => sgs.map((sg, i) => {
      if (i !== sgIdx) return sg
      const usedColors = new Set(sg.colorGroups.map(g => g.color))
      const next = PRODUCTS[sg.style].colors.find(c => !usedColors.has(c.name))
        ?? PRODUCTS[sg.style].colors[0]
      return { ...sg, colorGroups: [...sg.colorGroups, { color: next.name, quantities: {} }] }
    }))
  }

  function removeColorGroup(sgIdx: number, cgIdx: number) {
    setStyleGroups(sgs => sgs.map((sg, i) =>
      i !== sgIdx ? sg : { ...sg, colorGroups: sg.colorGroups.filter((_, j) => j !== cgIdx) }
    ))
  }

  function setGroupColor(sgIdx: number, cgIdx: number, color: string) {
    setStyleGroups(sgs => sgs.map((sg, i) =>
      i !== sgIdx ? sg : {
        ...sg,
        colorGroups: sg.colorGroups.map((g, j) => j !== cgIdx ? g : { ...g, color }),
      }
    ))
  }

  function setGroupQty(sgIdx: number, cgIdx: number, size: string, value: number) {
    setStyleGroups(sgs => sgs.map((sg, i) =>
      i !== sgIdx ? sg : {
        ...sg,
        colorGroups: sg.colorGroups.map((g, j) =>
          j !== cgIdx ? g : { ...g, quantities: { ...g.quantities, [size]: value } }
        ),
      }
    ))
  }

  // ── Validation & submit ────────────────────────────────────────────────────

  function validate() {
    const errs: Record<string, string> = {}
    if (totalQuantity() === 0) errs.sizes = 'Add at least 1 item in any size'
    if (!frontFile) errs.front = 'Front artwork is required'
    if (!billing?.full_name)    errs.billing_name    = 'Full name is required'
    if (!billing?.phone)        errs.billing_phone   = 'Phone number is required'
    if (!billing?.address_line1) errs.billing_address = 'Address is required'
    if (!billing?.city)         errs.billing_city    = 'City is required'
    if (!billing?.postal_code)  errs.billing_postal  = 'Postal code is required'
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)

    const config = {
      style_groups: styleGroups
        .map(sg => ({
          shirt_style: sg.style,
          color_groups: sg.colorGroups
            .map(g => ({
              color: g.color,
              sizes: PRODUCTS[sg.style].sizes
                .map(size => ({ size, quantity: g.quantities[size] ?? 0 }))
                .filter(s => s.quantity > 0),
            }))
            .filter(g => g.sizes.length > 0),
        }))
        .filter(sg => sg.color_groups.length > 0),
      front_file_path: null,
      back_file_path: null,
      front_file_url: null,
      back_file_url: null,
      dtf_front_width: dtfFrontW ? parseFloat(dtfFrontW) : null,
      dtf_front_height: dtfFrontH ? parseFloat(dtfFrontH) : null,
      dtf_back_width: dtfBackW ? parseFloat(dtfBackW) : null,
      dtf_back_height: dtfBackH ? parseFloat(dtfBackH) : null,
      printful_variant_id: null,
    }

    const draftRes = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_type: 'shirt', customer_notes: notes || null, configuration: config, billing }),
    })

    if (!draftRes.ok) {
      toast.error('Failed to create order. Please try again.')
      setLoading(false)
      return
    }

    const { order_id } = await draftRes.json()

    let front = null
    let back = null
    try {
      if (frontFile) front = await uploadFile(frontFile, 'front_artwork', order_id)
      if (backFile) back = await uploadFile(backFile, 'back_artwork', order_id)
    } catch {
      toast.error('File upload failed. Please try again.')
      setLoading(false)
      return
    }

    await fetch(`/api/orders/${order_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        configuration: {
          ...config,
          front_file_path: front?.storage_path ?? null,
          back_file_path: back?.storage_path ?? null,
          front_file_url: front?.public_url ?? null,
          back_file_url: back?.public_url ?? null,
        },
      }),
    })

    toast.success('Order submitted! We will be in touch with a quote.')
    router.push(`/order-confirmation/${order_id}`)
  }

  async function handleCustomQuote(e: React.FormEvent) {
    e.preventDefault()
    if (!customDesc.trim()) { toast.error('Please describe what you need.'); return }
    setCustomLoading(true)
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_type: 'diy',
        customer_notes: customDesc,
        configuration: { description: customDesc, dimensions: '', reference_images: [] },
      }),
    })
    if (!res.ok) { toast.error('Failed to submit. Please try again.'); setCustomLoading(false); return }
    const { order_id } = await res.json()
    toast.success('Custom quote request submitted!')
    router.push(`/order-confirmation/${order_id}`)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Custom Apparel</h1>
      <p className="mb-8 text-gray-500">Upload your design once — we'll apply it across all the styles you need. One invoice per design.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-xl bg-white p-4 sm:p-8 shadow-sm border border-gray-200">

        {/* ── Artwork (shared across all styles) ── */}
        <div>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">Artwork</h2>
          <p className="mb-4 text-xs text-gray-400">Same design applied to all styles below</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FileDropzone
                accept="image/png,image/jpeg,image/webp"
                label="Front artwork *"
                onFile={setFrontFile}
                progress={progress['front_artwork']}
                fileName={frontFile?.name}
                previewUrl={frontFile ? URL.createObjectURL(frontFile) : undefined}
                error={errors.front}
              />
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16">DTF size</span>
                <input
                  type="number" min={0} step={0.1} placeholder="W″"
                  value={dtfFrontW}
                  onChange={e => setDtfFrontW(e.target.value)}
                  className="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-gray-400 text-xs">×</span>
                <input
                  type="number" min={0} step={0.1} placeholder="H″"
                  value={dtfFrontH}
                  onChange={e => setDtfFrontH(e.target.value)}
                  className="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <FileDropzone
                accept="image/png,image/jpeg,image/webp"
                label="Back artwork (optional)"
                onFile={setBackFile}
                progress={progress['back_artwork']}
                fileName={backFile?.name}
                previewUrl={backFile ? URL.createObjectURL(backFile) : undefined}
              />
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16">DTF size</span>
                <input
                  type="number" min={0} step={0.1} placeholder="W″"
                  value={dtfBackW}
                  onChange={e => setDtfBackW(e.target.value)}
                  className="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-gray-400 text-xs">×</span>
                <input
                  type="number" min={0} step={0.1} placeholder="H″"
                  value={dtfBackH}
                  onChange={e => setDtfBackH(e.target.value)}
                  className="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-400">PNG, JPEG, or WebP — max 25 MB — 300 DPI recommended · Leave size blank if unsure</p>
        </div>

        {/* ── Style groups ── */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Styles &amp; quantities</h2>
          {errors.sizes && <p className="mb-3 text-xs text-red-600">{errors.sizes}</p>}

          <div className="flex flex-col gap-6">
            {styleGroups.map((sg, sgIdx) => {
              const product = PRODUCTS[sg.style]
              const sgQty = styleGroupQuantity(sg)
              const isLastSG = sgIdx === styleGroups.length - 1
              return (
                <div
                  key={sgIdx}
                  ref={isLastSG ? newStyleGroupRef : undefined}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-5"
                >
                  {/* Style header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(PRODUCTS) as ShirtStyle[]).map(style => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setStyleGroupStyle(sgIdx, style)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            sg.style === style
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'
                          }`}
                        >
                          {PRODUCTS[style].label}
                        </button>
                      ))}
                    </div>
                    {styleGroups.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStyleGroup(sgIdx)}
                        className="ml-3 shrink-0 text-xs text-gray-400 hover:text-red-500 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="mb-4 text-xs text-gray-400">{product.sublabel} · {product.sku}{sgQty > 0 ? ` · ${sgQty} items` : ''}</p>

                  {/* Colour groups within this style */}
                  <div className="flex flex-col gap-4">
                    {sg.colorGroups.map((group, cgIdx) => {
                      const cgQty = colorGroupQuantity(group)
                      return (
                        <div key={cgIdx} className="rounded-lg border border-gray-200 bg-white p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-4 w-4 rounded-full border border-gray-300 shrink-0"
                                style={{ backgroundColor: product.colors.find(c => c.name === group.color)?.hex ?? '#ccc' }}
                              />
                              <span className="text-sm font-medium text-gray-700">{group.color}</span>
                              {cgQty > 0 && (
                                <span className="text-xs text-gray-400">· {cgQty} items</span>
                              )}
                            </div>
                            {sg.colorGroups.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeColorGroup(sgIdx, cgIdx)}
                                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          {/* Swatch picker */}
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {product.colors.map(({ name, hex }) => {
                              const selected = group.color === name
                              const light = isLight(hex)
                              return (
                                <button
                                  key={name}
                                  type="button"
                                  title={name}
                                  onClick={() => setGroupColor(sgIdx, cgIdx, name)}
                                  className={`h-6 w-6 rounded-full transition-transform hover:scale-110 focus:outline-none ${
                                    selected ? 'ring-2 ring-offset-1 ring-indigo-600 scale-110' : ''
                                  } ${light ? 'border border-gray-300' : ''}`}
                                  style={{ backgroundColor: hex }}
                                />
                              )
                            })}
                          </div>

                          {/* Size quantities */}
                          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                            {product.sizes.map(size => (
                              <div key={size} className="flex flex-col items-center gap-1">
                                <label className="text-xs font-medium text-gray-500">{size}</label>
                                <input
                                  type="number" min={0} max={999}
                                  value={group.quantities[size] ?? 0}
                                  onChange={e => setGroupQty(sgIdx, cgIdx, size, parseInt(e.target.value) || 0)}
                                  className="w-full rounded-lg border border-gray-300 bg-white p-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => addColorGroup(sgIdx)}
                    className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors w-full justify-center"
                  >
                    <span className="text-base leading-none">+</span> Add another colour
                  </button>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={addStyleGroup}
            className="mt-4 flex items-center gap-1.5 rounded-lg border border-dashed border-indigo-300 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-600 hover:border-indigo-500 hover:bg-indigo-100 transition-colors w-full justify-center"
          >
            <span className="text-base leading-none">+</span> Add another style
          </button>

          {totalQuantity() > 0 && (
            <p className="mt-3 text-sm text-gray-500">
              Total: <strong>{totalQuantity()} items</strong>
              <span className="text-gray-400">
                {' '}({styleGroups
                  .filter(sg => styleGroupQuantity(sg) > 0)
                  .map(sg => `${PRODUCTS[sg.style].label} ×${styleGroupQuantity(sg)}`)
                  .join(', ')})
              </span>
            </p>
          )}
        </div>

        {/* ── Notes ── */}
        <Textarea
          label="Additional notes (optional)"
          placeholder="Special instructions, references, deadlines..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
        />

        <BillingSection
          onChange={setBilling}
          errors={{
            full_name:     errors.billing_name,
            phone:         errors.billing_phone,
            address_line1: errors.billing_address,
            city:          errors.billing_city,
            postal_code:   errors.billing_postal,
          }}
        />

        <Button type="submit" loading={loading || uploading} size="lg">
          Submit order
        </Button>
      </form>

      {/* ── Custom quote ── */}
      <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Need something completely custom?</h3>
            <p className="mt-0.5 text-sm text-gray-500">Not sure about sizes, colours, or artwork? Describe what you have in mind and we will reach out with a custom quote.</p>
          </div>
          <button
            type="button"
            onClick={() => setCustomOpen(o => !o)}
            className="ml-4 shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {customOpen ? 'Close' : 'Request quote'}
          </button>
        </div>

        {customOpen && (
          <form onSubmit={handleCustomQuote} className="mt-4 flex flex-col gap-3">
            <textarea
              placeholder="Describe your idea — product type, quantity, colours, any artwork or references, timeline..."
              value={customDesc}
              onChange={e => setCustomDesc(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex justify-end">
              <Button type="submit" loading={customLoading} variant="secondary">
                Send request
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
