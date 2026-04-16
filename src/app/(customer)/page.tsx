import { notFound } from 'next/navigation'

// The landing page lives at app/page.tsx (outside the customer layout).
// This file exists only to satisfy the route group; it should never be reached.
export default function CustomerHomePage() {
  notFound()
}
