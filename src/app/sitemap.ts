import { MetadataRoute } from 'next'

const BASE = 'https://www.ghoandco.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: BASE,                        lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/order/shirts`,      lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/order/3d-prints`,   lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/order/diy`,         lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/order/lighting`,    lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/portfolio`,         lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/login`,             lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${BASE}/register`,          lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
  ]
}
