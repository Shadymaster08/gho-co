'use client'

import { useState } from 'react'
import type { FileType } from '@/types'

interface UploadResult {
  storage_path: string
  public_url: string
}

export function useUpload() {
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [uploading, setUploading] = useState(false)

  async function uploadFile(file: File, fileType: FileType, orderId: string): Promise<UploadResult> {
    if (!orderId) throw new Error('Order ID required before uploading')

    setUploading(true)
    setProgress(p => ({ ...p, [fileType]: 0 }))

    // 1. Get presigned URL
    const presignRes = await fetch('/api/uploads/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId,
        file_type: fileType,
        file_name: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
      }),
    })

    if (!presignRes.ok) {
      const err = await presignRes.json()
      setUploading(false)
      throw new Error(err.error ?? 'Failed to get upload URL')
    }

    const { signedUrl, storage_path, public_url } = await presignRes.json()

    // 2. Upload directly to Supabase Storage with progress tracking
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', signedUrl)
      xhr.setRequestHeader('Content-Type', file.type)

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(p => ({ ...p, [fileType]: Math.round((e.loaded / e.total) * 100) }))
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setProgress(p => ({ ...p, [fileType]: 100 }))
          resolve()
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`))
        }
      }

      xhr.onerror = () => reject(new Error('Network error during upload'))
      xhr.send(file)
    })

    setUploading(false)
    return { storage_path, public_url }
  }

  return { uploadFile, progress, uploading }
}
