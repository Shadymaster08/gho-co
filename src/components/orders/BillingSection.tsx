'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import type { BillingData } from '@/types'

const EMPTY: BillingData = {
  full_name: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  province: 'QC',
  postal_code: '',
  country: 'CA',
}

const PROVINCES = [
  'AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT',
]

interface Props {
  onChange: (data: BillingData) => void
  errors?: Partial<Record<keyof BillingData, string>>
}

export function BillingSection({ onChange, errors = {} }: Props) {
  const [data, setData] = useState<BillingData>(EMPTY)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    createClient()
      .from('profiles')
      .select('full_name,phone,address_line1,address_line2,city,province,postal_code,country')
      .single()
      .then(({ data: p }) => {
        if (p) {
          const filled: BillingData = {
            full_name:    p.full_name    ?? '',
            phone:        p.phone        ?? '',
            address_line1: p.address_line1 ?? '',
            address_line2: p.address_line2 ?? '',
            city:         p.city         ?? '',
            province:     p.province     ?? 'QC',
            postal_code:  p.postal_code  ?? '',
            country:      p.country      ?? 'CA',
          }
          setData(filled)
          onChange(filled)
        }
        setLoaded(true)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function update(field: keyof BillingData, value: string) {
    setData(prev => {
      const next = { ...prev, [field]: value }
      onChange(next)
      return next
    })
  }

  if (!loaded) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 animate-pulse">
        <div className="h-4 w-40 bg-gray-100 rounded mb-4" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Billing information
      </h2>

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Full name *"
            placeholder="Jane Doe"
            value={data.full_name}
            onChange={e => update('full_name', e.target.value)}
            error={errors.full_name}
          />
          <Input
            label="Phone number *"
            placeholder="+1 (514) 555-0100"
            type="tel"
            value={data.phone}
            onChange={e => update('phone', e.target.value)}
            error={errors.phone}
          />
        </div>

        <Input
          label="Address *"
          placeholder="123 Rue Principale"
          value={data.address_line1}
          onChange={e => update('address_line1', e.target.value)}
          error={errors.address_line1}
        />
        <Input
          label="Apartment, suite, etc. (optional)"
          placeholder="Apt 4B"
          value={data.address_line2}
          onChange={e => update('address_line2', e.target.value)}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="City *"
            placeholder="Montréal"
            value={data.city}
            onChange={e => update('city', e.target.value)}
            error={errors.city}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Province *</label>
            <select
              value={data.province}
              onChange={e => update('province', e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <Input
            label="Postal code *"
            placeholder="H2X 1Y3"
            value={data.postal_code}
            onChange={e => update('postal_code', e.target.value.toUpperCase())}
            error={errors.postal_code}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Country</label>
          <select
            value={data.country}
            onChange={e => update('country', e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-48"
          >
            <option value="CA">Canada</option>
            <option value="US">United States</option>
          </select>
        </div>
      </div>
    </div>
  )
}
