'use client'

import { useState } from 'react'
import { toast } from 'sonner'

export function DailyDigestButton() {
  const [loading, setLoading] = useState(false)

  async function send() {
    setLoading(true)
    const res = await fetch('/api/agents/daily-digest')
    if (res.ok) {
      toast.success('Daily digest sent to your email.')
    } else {
      toast.error('Failed to send digest.')
    }
    setLoading(false)
  }

  return (
    <button
      onClick={send}
      disabled={loading}
      className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      {loading ? 'Sending…' : '📧 Send daily digest'}
    </button>
  )
}
