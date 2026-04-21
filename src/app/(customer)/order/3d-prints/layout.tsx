import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '3D Printing Service',
  description:
    'Custom 3D printing in Canada. Upload your STL file or describe your idea — we print in PLA, PETG, TPU and more on a Bambu A1 printer.',
  keywords: [
    '3D printing service Canada', '3D printing Quebec', 'custom 3D prints', 'STL printing',
    'PLA printing', 'PETG printing', 'impression 3D Canada', 'impression 3D personnalisée',
  ],
  alternates: { canonical: 'https://www.ghoandco.com/order/3d-prints' },
  openGraph: {
    title: '3D Printing Service — Gho&Co',
    description: 'Upload your STL file or describe your idea. We print in PLA, PETG, TPU and more.',
    url: 'https://www.ghoandco.com/order/3d-prints',
  },
}

export default function PrintsLayout({ children }: { children: React.ReactNode }) {
  return children
}
