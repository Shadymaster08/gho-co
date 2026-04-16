import { ConsultationForm } from '@/components/orders/ConsultationForm'

export const metadata = { title: 'DIY Project — Gho&Co' }

export default function DiyOrderPage() {
  return (
    <ConsultationForm
      productType="diy"
      title="Custom DIY Project"
      descriptionPlaceholder="Describe what you want to create. What is it? What materials do you have in mind? What will it be used for? The more detail, the better."
    />
  )
}
