'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, FileText, Receipt, Truck, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const nav = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/quotes', label: 'Quotes', icon: FileText },
  { href: '/admin/invoices', label: 'Invoices', icon: Receipt },
  { href: '/admin/supplier', label: 'Supplier', icon: Truck },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex h-screen w-52 flex-col border-r border-[#d2d2d7] bg-white">
      <div className="px-5 py-5">
        <Link href="/admin" className="text-sm font-semibold text-[#1d1d1f]">
          Gho&amp;Co
        </Link>
        <p className="mt-0.5 text-xs text-[#86868b]">Admin</p>
      </div>

      <div className="h-px bg-[#d2d2d7] mx-4" />

      <nav className="flex flex-1 flex-col gap-0.5 p-3 pt-3">
        {nav.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-[#f5f5f7] text-[#1d1d1f]'
                  : 'text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]'
              )}
            >
              <Icon className={cn('h-4 w-4', active ? 'text-[#0071e3]' : 'text-[#6e6e73]')} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="h-px bg-[#d2d2d7] mx-4" />
      <div className="p-3">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
