'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { FileDropzone } from '@/components/ui/FileDropzone'
import { useUpload } from '@/hooks/useUpload'
import { X } from 'lucide-react'

interface ConsultationFormProps {
  productType: 'diy' | 'lighting'
  title: string
  descriptionPlaceholder: string
}

export function ConsultationForm({ productType, title, descriptionPlaceholder }: ConsultationFormProps) {
  const router = useRouter()
  const [description, setDescription] = useState('')
  const [dimensions, setDimensions] = useState('')
  const [budget, setBudget] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [refFiles, setRefFiles] = useState<File[]>([])
  const [uploadedRefs, setUploadedRefs] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { uploadFile, progress, uploading } = useUpload(orderId)

  function addRefFile(file: File) {
    if (refFiles.length >= 5) { toast.error('Maximum 5 reference images'); return }
    setRefFiles(prev => [...prev, file])
  }

  function removeRefFile(idx: number) {
    setRefFiles(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (description.length < 10) newErrors.description = 'Please describe your project in at least 10 characters'
    if (Object.keys(newErrors).length) { setErrors(newErrors); return }

    setLoading(true)

    // Create draft order first
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_type: productType,
        customer_notes: notes || null,
        configuration: { description, dimensions: dimensions || '', reference_images: [], budget: budget || '' },
      }),
    })

    if (!res.ok) {
      toast.error('Failed to submit order. Please try again.')
      setLoading(false)
      return
    }

    const { order_id } = await res.json()
    setOrderId(order_id)

    // Upload reference images
    const refs: string[] = []
    try {
      for (const file of refFiles) {
        const result = await uploadFile(file, 'reference')
        refs.push(result.public_url)
      }
    } catch {
      toast.error('Image upload failed. Order saved without references.')
    }

    // Update with file URLs
    if (refs.length > 0) {
      await fetch(`/api/orders/${order_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configuration: { description, dimensions: dimensions || '', reference_images: refs, budget: budget || '' },
        }),
      })
    }

    toast.success('Request submitted! We will be in touch with a quote.')
    router.push(`/order-confirmation/${order_id}`)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mb-8 text-gray-500">Tell us what you have in mind and we will reach out with a custom quote.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-xl bg-white p-8 shadow-sm border border-gray-200">
        <Textarea
          label="Describe your project *"
          placeholder={descriptionPlaceholder}
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={6}
          error={errors.description}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Dimensions / size (optional)"
            placeholder="e.g. 60cm × 30cm × 15cm"
            value={dimensions}
            onChange={e => setDimensions(e.target.value)}
          />
          <Input
            label="Budget range (optional)"
            placeholder="e.g. $50–$150"
            value={budget}
            onChange={e => setBudget(e.target.value)}
          />
        </div>

        {/* Reference images */}
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Reference images <span className="font-normal normal-case text-gray-400">(optional, up to 5)</span>
          </h2>

          {refFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {refFiles.map((file, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="h-20 w-20 rounded-lg object-cover border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeRefFile(idx)}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {refFiles.length < 5 && (
            <FileDropzone
              accept="image/png,image/jpeg,image/webp"
              label="Add reference image"
              onFile={addRefFile}
              progress={progress['reference']}
            />
          )}
          <p className="mt-1 text-xs text-gray-400">PNG, JPEG, or WebP — max 10 MB each</p>
        </div>

        <Textarea
          label="Additional notes (optional)"
          placeholder="Timeline, material preferences, special requirements..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
        />

        <Button type="submit" loading={loading || uploading} size="lg">
          Submit request
        </Button>
      </form>
    </div>
  )
}
