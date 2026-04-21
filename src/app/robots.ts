import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/portal/', '/api/', '/order-confirmation/'],
      },
    ],
    sitemap: 'https://www.ghoandco.com/sitemap.xml',
  }
}
