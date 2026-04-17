'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Upload, Loader2, Eye, EyeOff, Trash2, Copy, Check, X, CheckSquare, Square } from 'lucide-react'

interface PortfolioImage {
  id: string
  title: string | null
  product_type: string | null
  original_public_url: string
  generated_public_url: string | null
  status: string
  published: boolean
  created_at: string
}

export default function PortfolioClient({ initial }: { initial: PortfolioImage[] }) {
  const [images, setImages] = useState<PortfolioImage[]>(initial)
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [productType, setProductType] = useState('shirt')
  const [shirtSide, setShirtSide] = useState<'front' | 'back'>('front')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const productTypes = [
    { value: 'shirt', label: 'Shirt / Clothing', emoji: '👕' },
    { value: '3d_print', label: '3D Print', emoji: '🧊' },
    { value: 'lighting', label: 'Lighting', emoji: '💡' },
  ]

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    for (const file of Array.from(files)) {
      try {
        // Upload original
        const form = new FormData()
        form.append('file', file)
        const upRes = await fetch('/api/portfolio/upload', { method: 'POST', body: form })
        if (!upRes.ok) throw new Error((await upRes.json()).error)
        const { id } = await upRes.json()

        // Add pending row immediately
        setImages(prev => [{
          id,
          title: null,
          product_type: null,
          original_public_url: URL.createObjectURL(file),
          generated_public_url: null,
          status: 'generating',
          published: false,
          created_at: new Date().toISOString(),
        }, ...prev])

        // Trigger enhancement (non-blocking — update status when done)
        fetch('/api/agents/image-enhance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ portfolioImageId: id, productType, shirtSide: productType === 'shirt' ? shirtSide : undefined }),
        }).then(async (res) => {
          const data = await res.json()
          if (data.generated_public_url) {
            setImages(prev => prev.map(img =>
              img.id === id
                ? { ...img, status: 'done', generated_public_url: data.generated_public_url }
                : img
            ))
            toast.success('Image generated!')
          } else {
            setImages(prev => prev.map(img =>
              img.id === id ? { ...img, status: 'error' } : img
            ))
            toast.error('Generation failed: ' + (data.error ?? 'Unknown error'))
          }
        })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed')
      }
    }
    setUploading(false)
  }

  async function togglePublish(img: PortfolioImage) {
    const next = !img.published
    const res = await fetch('/api/portfolio', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: img.id, published: next }),
    })
    if (res.ok) {
      setImages(prev => prev.map(i => i.id === img.id ? { ...i, published: next } : i))
      toast.success(next ? 'Published to portfolio' : 'Unpublished')
    }
  }

  async function deleteImage(id: string) {
    if (!confirm('Delete this image?')) return
    const res = await fetch('/api/portfolio', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setImages(prev => prev.filter(i => i.id !== id))
      toast.success('Deleted')
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === images.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(images.map(i => i.id)))
    }
  }

  async function deleteSelected() {
    if (!confirm(`Delete ${selected.size} image${selected.size > 1 ? 's' : ''}?`)) return
    setDeleting(true)
    const ids = Array.from(selected)
    const results = await Promise.all(ids.map(id =>
      fetch('/api/portfolio', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    ))
    const failed = results.filter(r => !r.ok).length
    setImages(prev => prev.filter(i => !selected.has(i.id)))
    setSelected(new Set())
    setDeleting(false)
    if (failed > 0) {
      toast.error(`${failed} deletion${failed > 1 ? 's' : ''} failed`)
    } else {
      toast.success(`Deleted ${ids.length} image${ids.length > 1 ? 's' : ''}`)
    }
  }

  async function copyUrl(url: string, id: string) {
    await navigator.clipboard.writeText(url)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div>
      {/* Lightbox */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreview(null)}
        >
          <button className="absolute right-5 top-5 text-white/60 hover:text-white">
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-[#d2d2d7] bg-[#fafafa] px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-[#6e6e73] hover:text-[#1d1d1f]">
              {selected.size === images.length ? <CheckSquare className="h-4 w-4 text-[#0071e3]" /> : <Square className="h-4 w-4" />}
              {selected.size === images.length ? 'Deselect all' : 'Select all'}
            </button>
            <span className="text-sm text-[#86868b]">{selected.size} selected</span>
          </div>
          <button
            onClick={deleteSelected}
            disabled={deleting}
            className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete {selected.size}
          </button>
        </div>
      )}

      {/* Product type selector */}
      <div className="mb-4 flex gap-2">
        {productTypes.map(pt => (
          <button
            key={pt.value}
            onClick={() => setProductType(pt.value)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
              productType === pt.value
                ? 'border-[#0071e3] bg-[#0071e3]/5 text-[#0071e3]'
                : 'border-[#d2d2d7] text-[#6e6e73] hover:border-[#6e6e73]'
            }`}
          >
            <span>{pt.emoji}</span> {pt.label}
          </button>
        ))}
      </div>

      {/* Front / Back toggle for shirts */}
      {productType === 'shirt' && (
        <div className="mb-4 flex gap-2">
          {(['front', 'back'] as const).map(side => (
            <button
              key={side}
              onClick={() => setShirtSide(side)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium capitalize transition-colors ${
                shirtSide === side
                  ? 'border-[#0071e3] bg-[#0071e3]/5 text-[#0071e3]'
                  : 'border-[#d2d2d7] text-[#6e6e73] hover:border-[#6e6e73]'
              }`}
            >
              {side} of garment
            </button>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <div
        className="mb-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#d2d2d7] bg-[#fafafa] py-12 transition-colors hover:border-[#0071e3] hover:bg-blue-50/30"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-[#0071e3]" />
        ) : (
          <Upload className="h-8 w-8 text-[#86868b]" />
        )}
        <p className="mt-3 text-sm font-medium text-[#1d1d1f]">
          {uploading ? 'Uploading…' : 'Drop product photos here, or tap to select'}
        </p>
        <p className="mt-1 text-xs text-[#86868b]">JPEG, PNG, WebP, HEIC — multiple files supported</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* Grid */}
      {images.length === 0 ? (
        <p className="text-center text-sm text-[#86868b]">No images yet — upload your first product shot above.</p>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <button onClick={toggleSelectAll} className="flex items-center gap-2 text-xs text-[#6e6e73] hover:text-[#1d1d1f]">
              {selected.size === images.length && images.length > 0 ? <CheckSquare className="h-3.5 w-3.5 text-[#0071e3]" /> : <Square className="h-3.5 w-3.5" />}
              {selected.size === images.length && images.length > 0 ? 'Deselect all' : 'Select all'}
            </button>
          </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {images.map(img => (
            <div
              key={img.id}
              className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-colors ${selected.has(img.id) ? 'border-[#0071e3] ring-2 ring-[#0071e3]/20' : 'border-[#d2d2d7]'}`}
            >
              {/* Checkbox overlay */}
              <button
                onClick={() => toggleSelect(img.id)}
                className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-md bg-white/90 shadow-sm transition-opacity"
              >
                {selected.has(img.id) ? <CheckSquare className="h-4 w-4 text-[#0071e3]" /> : <Square className="h-4 w-4 text-[#6e6e73]" />}
              </button>

              {/* Image comparison */}
              <div className="relative grid grid-cols-2 divide-x divide-[#d2d2d7]">
                <div className="aspect-square overflow-hidden bg-[#f5f5f7]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.original_public_url} alt="Original" className="h-full w-full object-cover" />
                </div>
                <div className="aspect-square overflow-hidden bg-[#0c0c0c]">
                  {img.status === 'generating' ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-white/40" />
                    </div>
                  ) : img.status === 'error' ? (
                    <div className="flex h-full items-center justify-center p-4 text-center">
                      <p className="text-xs text-red-400">Generation failed</p>
                    </div>
                  ) : img.generated_public_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.generated_public_url}
                      alt="Generated"
                      className="h-full w-full cursor-zoom-in object-cover"
                      onClick={() => setPreview(img.generated_public_url!)}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-xs text-white/20">Pending</p>
                    </div>
                  )}
                </div>
                {/* Labels */}
                <span className="absolute left-2 top-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-white/70">Original</span>
                <span className="absolute right-2 top-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-white/70">Generated</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-1">
                  {img.status === 'done' && (
                    <>
                      <button
                        onClick={() => togglePublish(img)}
                        title={img.published ? 'Unpublish' : 'Publish'}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                      >
                        {img.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      {img.generated_public_url && (
                        <button
                          onClick={() => copyUrl(img.generated_public_url!, img.id)}
                          title="Copy URL"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                        >
                          {copied === img.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${img.published ? 'text-green-600' : 'text-[#86868b]'}`}>
                    {img.status === 'generating' ? 'Generating…' : img.status === 'error' ? 'Error' : img.published ? 'Published' : 'Draft'}
                  </span>
                  <button
                    onClick={() => deleteImage(img.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6e6e73] transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  )
}
