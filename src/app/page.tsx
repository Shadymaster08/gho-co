import type { Metadata } from 'next'
import AnimatedLanding from './_landing/AnimatedLanding'
import { JsonLd, localBusinessSchema } from '@/components/JsonLd'

export const metadata: Metadata = {
  title: 'Gho&Co — Custom Shirts, 3D Prints & More in Canada',
  description:
    'Gho&Co creates custom printed shirts with DTF transfers, 3D printed items, DIY projects, and custom lighting. Order online and get a personalized quote.',
  alternates: { canonical: 'https://www.ghoandco.com' },
  openGraph: {
    title: 'Gho&Co — Custom Shirts, 3D Prints & More',
    description: 'Custom printed shirts, 3D printed items, DIY projects, and custom lighting. Made exactly the way you want it.',
    url: 'https://www.ghoandco.com',
  },
}

export default function HomePage() {
  return (
    <>
      <JsonLd data={localBusinessSchema} />
      <AnimatedLanding />
    </>
  )
}
