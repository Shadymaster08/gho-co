'use client'

import { useRef, useState } from 'react'
import Cropper from 'react-cropper'
import { RotateCcw, RotateCw, X, Check, Loader2 } from 'lucide-react'

interface Props {
  portfolioImageId: string
  imageUrl: string
  onConfirm: (id: string, generatedUrl: string) => void
  onClose: () => void
}

export default function LightingCropModal({ portfolioImageId, imageUrl, onConfirm, onClose }: Props) {
  const cropperRef = useRef<HTMLImageElement & { cropper: Cropper }>(null)
  const [saving, setSaving] = useState(false)

  function rotate(deg: number) {
    cropperRef.current?.cropper?.rotate(deg)
  }

  async function handleConfirm() {
    const canvas = cropperRef.current?.cropper?.getCroppedCanvas({ maxWidth: 1800, maxHeight: 1800 })
    if (!canvas) return
    const imageData = canvas.toDataURL('image/jpeg', 0.92)
    setSaving(true)
    try {
      const res = await fetch('/api/portfolio/crop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioImageId, imageData }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Crop failed')
      onConfirm(portfolioImageId, data.generated_public_url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Crop failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex w-full max-w-2xl flex-col gap-4 rounded-2xl bg-[#1c1c1e] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Crop &amp; Rotate</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-hidden rounded-xl bg-black">
          <Cropper
            ref={cropperRef}
            src={imageUrl}
            style={{ height: 420, width: '100%' }}
            aspectRatio={1}
            guides={true}
            viewMode={1}
            autoCropArea={1}
            background={false}
            responsive={true}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => rotate(-90)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
              title="Rotate left 90°"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={() => rotate(90)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
              title="Rotate right 90°"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:border-white/40 hover:text-white disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
