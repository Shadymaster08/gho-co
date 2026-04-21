export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Gho&Co',
  description:
    'Custom printed shirts with DTF transfers, 3D printed items, DIY projects, and custom lighting. Order online and get a personalized quote.',
  url: 'https://www.ghoandco.com',
  email: 'ghoetco@gmail.com',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'CA',
    addressRegion: 'QC',
  },
  priceRange: '$$',
  currenciesAccepted: 'CAD',
  paymentAccepted: 'Interac e-Transfer',
  areaServed: { '@type': 'Country', name: 'Canada' },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Custom Products',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Custom Printed Shirts' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: '3D Printing Service' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Custom DIY Projects' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Custom Lighting' } },
    ],
  },
  sameAs: ['https://www.ghoandco.com'],
}

export function serviceSchema(name: string, description: string, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    url,
    provider: {
      '@type': 'LocalBusiness',
      name: 'Gho&Co',
      url: 'https://www.ghoandco.com',
    },
    areaServed: { '@type': 'Country', name: 'Canada' },
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceUrl: url,
    },
  }
}
