'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { FileDropzone } from '@/components/ui/FileDropzone'
import { useUpload } from '@/hooks/useUpload'

// Bambu Lab filament catalogue
const MATERIALS: Record<string, { description: string; colors: string[] }> = {
  'PLA Basic': {
    description: 'Easy to print, great detail. Best for display pieces, prototypes, and indoor use.',
    colors: ['Black', 'White', 'Grey', 'Red', 'Blue', 'Navy', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink', 'Brown', 'Beige', 'Transparent'],
  },
  'PLA Matte': {
    description: 'Smooth matte finish with no sheen. Great for figurines, props, and display models.',
    colors: ['Matte Black', 'Matte White', 'Matte Grey', 'Matte Red', 'Matte Blue', 'Matte Green', 'Matte Yellow', 'Matte Orange', 'Matte Purple'],
  },
  'PLA Silk': {
    description: 'Shiny metallic-like finish. Perfect for decorative and eye-catching pieces.',
    colors: ['Silk Gold', 'Silk Silver', 'Silk Copper', 'Silk Red', 'Silk Blue', 'Silk Green', 'Silk Purple'],
  },
  'PETG': {
    description: 'Stronger and more flexible than PLA. Good for functional parts with moderate heat resistance.',
    colors: ['Black', 'White', 'Grey', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Transparent'],
  },
  'TPU': {
    description: 'Flexible and rubber-like. Great for phone cases, gaskets, grips, and wearables.',
    colors: ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Transparent'],
  },
}

export default function PrintOrderPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'upload' | 'consultation'>('upload')
  const [stlFile, setStlFile] = useState<File | null>(null)
  const [material, setMaterial] = useState('PLA Basic')
  const [color, setColor] = useState('Black')
  const [quantity, setQuantity] = useState(1)

  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { uploadFile, progress, uploading } = useUpload()

  const availableColors = MATERIALS[material]?.colors ?? []

  function handleMaterialChange(mat: string) {
    setMaterial(mat)
    const colors = MATERIALS[mat]?.colors ?? []
    setColor(prev => colors.includes(prev) ? prev : colors[0])
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (mode === 'upload' && !stlFile) errs.stl = 'Please upload an STL file'
    if (mode === 'consultation' && description.length < 10) errs.description = 'Please describe your project (min 10 characters)'
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)

    const config = {
      mode,
      stl_file_path: null,
      stl_file_url: null,
      material,
      color,
      quantity,

      description: mode === 'consultation' ? description : '',
    }

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_type: '3d_print', customer_notes: notes || null, configuration: config }),
    })

    if (!res.ok) { toast.error('Failed to submit order.'); setLoading(false); return }

    const { order_id } = await res.json()
    setOrderId(order_id)

    if (mode === 'upload' && stlFile) {
      try {
        const result = await uploadFile(stlFile, 'stl', order_id)
        await fetch(`/api/orders/${order_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            configuration: { ...config, stl_file_path: result.storage_path, stl_file_url: result.public_url },
          }),
        })
      } catch {
        toast.error('STL upload failed.')
        setLoading(false)
        return
      }
    }

    toast.success('Order submitted! We will review and send a quote.')
    router.push(`/order-confirmation/${order_id}`)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">3D Print Order</h1>
      <p className="mb-8 text-gray-500">Upload your STL file or describe what you want and we will take care of the rest.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-xl bg-white p-8 shadow-sm border border-gray-200">

        {/* Mode toggle */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Order type</h2>
          <div className="flex overflow-hidden rounded-lg border border-gray-200">
            {(['upload', 'consultation'] as const).map(m => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  mode === m ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {m === 'upload' ? 'I have an STL file' : 'I need a design'}
              </button>
            ))}
          </div>
        </div>

        {mode === 'upload' ? (
          <FileDropzone
            accept=".stl,application/octet-stream"
            label="Upload your STL file *"
            onFile={setStlFile}
            progress={progress['stl']}
            fileName={stlFile?.name}
            error={errors.stl}
          />
        ) : (
          <Textarea
            label="Describe what you want *"
            placeholder="What do you need printed? Dimensions, purpose, any references or inspiration images? The more detail the better."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={5}
            error={errors.description}
          />
        )}

        {/* Material */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Material</h2>
          <div className="flex flex-wrap gap-2 mb-2">
            {Object.keys(MATERIALS).map(mat => (
              <button key={mat} type="button" onClick={() => handleMaterialChange(mat)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  material === mat
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'
                }`}
              >
                {mat}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">{MATERIALS[material]?.description}</p>
        </div>

        {/* Color, Quantity, Infill */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Colour</label>
            <select value={color} onChange={e => setColor(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {availableColors.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <Input
            label="Quantity"
            type="number" min={1} max={999}
            value={quantity}
            onChange={e => setQuantity(parseInt(e.target.value) || 1)}
          />
        </div>

        <Textarea
          label="Additional notes (optional)"
          placeholder="Timeline, budget, layer height preference, special requirements..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
        />

        <Button type="submit" loading={loading || uploading} size="lg">
          Submit order
        </Button>
      </form>
    </div>
  )
}
