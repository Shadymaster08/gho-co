import type { Metadata } from 'next'
import { AdminSidebar } from '@/components/layout/AdminSidebar'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-auto pt-[52px] lg:pt-0">{children}</main>
    </div>
  )
}
