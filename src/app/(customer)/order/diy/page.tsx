import { ConsultationForm } from '@/components/orders/ConsultationForm'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Custom DIY Projects',
  description:
    "Have a unique project in mind? Describe your idea and we'll build it. Custom fabrication, modifications, one-of-a-kind builds — get a free quote.",
  keywords: ['custom DIY project Canada', 'custom fabrication', 'bespoke build', 'projet DIY personnalisé'],
  alternates: { canonical: 'https://www.ghoandco.com/order/diy' },
  openGraph: {
    title: 'Custom DIY Projects — Gho&Co',
    description: "Have a unique project in mind? Describe your idea and we'll build it.",
    url: 'https://www.ghoandco.com/order/diy',
  },
}

export default function DiyOrderPage() {
  return (
    <ConsultationForm
      productType="diy"
      title="Custom DIY Project"
      descriptionPlaceholder="Describe what you want to create. What is it? What materials do you have in mind? What will it be used for? The more detail, the better."
    />
  )
}
