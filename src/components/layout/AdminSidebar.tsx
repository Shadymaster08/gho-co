'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, FileText, Receipt, Truck, Images, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { LocaleSwitcherLight } from '@/components/ui/LocaleSwitcher'

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLocale()
  const s = t.admin.sidebar

  const nav = [
    { href: '/admin', label: s.dashboard, icon: LayoutDashboard, exact: true },
    { href: '/admin/orders', label: s.orders, icon: ShoppingBag },
    { href: '/admin/quotes', label: s.quotes, icon: FileText },
    { href: '/admin/invoices', label: s.invoices, icon: Receipt },
    { href: '/admin/supplier', label: s.supplier, icon: Truck },
    { href: '/admin/portfolio', label: s.portfolio, icon: Images },
  ]

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
        <div className="mb-1 px-3 py-1">
          <LocaleSwitcherLight />
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
        >
          <LogOut className="h-4 w-4" />
          {s.signOut}
        </button>
      </div>
    </aside>
  )
}
