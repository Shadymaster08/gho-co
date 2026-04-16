import { ConsultationForm } from '@/components/orders/ConsultationForm'

export const metadata = { title: 'Custom Lighting — Gho&Co' }

export default function LightingOrderPage() {
  return (
    <ConsultationForm
      productType="lighting"
      title="Custom Lighting"
      descriptionPlaceholder="Describe the lighting you want. What space is it for? What mood or effect are you going for? Any specific colors, brightness levels, or mounting requirements?"
    />
  )
}
