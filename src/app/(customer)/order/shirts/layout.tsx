import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Custom Printed Shirts',
  description:
    'Order custom shirts with DTF heat-press transfers. T-shirts, hoodies, crewnecks, long sleeves — any colour, any design. Get a quote online.',
  keywords: [
    'custom shirts Canada', 'custom t-shirts', 'DTF printing', 'heat press transfers',
    'personalized hoodies', 'custom crewneck', 'chandails personnalisés', 'impression DTF',
  ],
  alternates: { canonical: 'https://www.ghoandco.com/order/shirts' },
  openGraph: {
    title: 'Custom Printed Shirts — Gho&Co',
    description: 'T-shirts, hoodies, crewnecks — any colour, any design. DTF transfers for sharp, durable prints.',
    url: 'https://www.ghoandco.com/order/shirts',
  },
}

export default function ShirtsLayout({ children }: { children: React.ReactNode }) {
  return children
}
