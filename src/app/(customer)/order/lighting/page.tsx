import { ConsultationForm } from '@/components/orders/ConsultationForm'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Custom Lighting',
  description:
    'Custom lighting solutions designed and built to order. LED strips, accent lighting, ambient setups — describe your vision and get a personalized quote.',
  keywords: ['custom lighting Canada', 'custom LED lighting', 'bespoke lighting', 'éclairage personnalisé Canada'],
  alternates: { canonical: 'https://www.ghoandco.com/order/lighting' },
  openGraph: {
    title: 'Custom Lighting — Gho&Co',
    description: 'LED strips, accent lighting, ambient setups — describe your vision and get a personalized quote.',
    url: 'https://www.ghoandco.com/order/lighting',
  },
}

export default function LightingOrderPage() {
  return (
    <ConsultationForm
      productType="lighting"
      title="Custom Lighting"
      descriptionPlaceholder="Describe the lighting you want. What space is it for? What mood or effect are you going for? Any specific colors, brightness levels, or mounting requirements?"
    />
  )
}
