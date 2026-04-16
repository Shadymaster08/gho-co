'use client'

import { useCallback, useState } from 'react'
import { Upload, X, File } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileDropzoneProps {
  accept: string
  label: string
  onFile: (file: File) => void
  progress?: number
  error?: string
  fileName?: string
  previewUrl?: string
  className?: string
}

export function FileDropzone({ accept, label, onFile, progress, error, fileName, previewUrl, className }: FileDropzoneProps) {
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }, [onFile])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFile(file)
  }, [onFile])

  const isUploading = progress !== undefined && progress > 0 && progress < 100
  const isDone = progress === 100 || !!fileName

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors',
          dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50',
          error && 'border-red-400 bg-red-50',
          isDone && !isUploading && 'border-green-400 bg-green-50',
        )}
      >
        <input type="file" accept={accept} className="sr-only" onChange={handleChange} />

        {previewUrl && accept.startsWith('image') ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Preview" className="max-h-32 rounded object-contain" />
        ) : fileName ? (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <File className="h-5 w-5 text-green-600" />
            <span className="max-w-[180px] truncate">{fileName}</span>
          </div>
        ) : (
          <Upload className={cn('h-8 w-8', error ? 'text-red-400' : 'text-gray-400')} />
        )}

        <div>
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className="text-xs text-gray-400">Drag &amp; drop or click to browse</p>
        </div>

        {isUploading && (
          <div className="absolute inset-x-4 bottom-3 h-1.5 rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
