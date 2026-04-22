'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, FileText, Receipt, Wallet, Truck, Images, TrendingUp, LogOut, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { LocaleSwitcherLight } from '@/components/ui/LocaleSwitcher'

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLocale()
  const s = t.admin.sidebar
  const [open, setOpen] = useState(false)

  const nav = [
    { href: '/admin', label: s.dashboard, icon: LayoutDashboard, exact: true },
    { href: '/admin/orders', label: s.orders, icon: ShoppingBag },
    { href: '/admin/quotes', label: s.quotes, icon: FileText },
    { href: '/admin/invoices', label: s.invoices, icon: Receipt },
    { href: '/admin/expenses', label: 'Expenses', icon: Wallet },
    { href: '/admin/supplier', label: s.supplier, icon: Truck },
    { href: '/admin/portfolio', label: s.portfolio, icon: Images },
    { href: '/admin/trends', label: s.trends ?? 'Trends', icon: TrendingUp },
  ]

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <nav className="flex flex-1 flex-col gap-0.5 p-3 pt-3">
        {nav.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-[#f5f5f7] text-[#1d1d1f]'
                  : 'text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-[#0071e3]' : 'text-[#6e6e73]')} />
              {label}
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex h-screen w-52 shrink-0 flex-col border-r border-[#d2d2d7] bg-white sticky top-0">
        <div className="px-5 py-5">
          <Link href="/admin" className="text-sm font-semibold text-[#1d1d1f]">
            Gho&amp;Co
          </Link>
          <p className="mt-0.5 text-xs text-[#86868b]">Admin</p>
        </div>

        <div className="h-px bg-[#d2d2d7] mx-4" />

        <NavLinks />

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

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-white border-b border-[#d2d2d7]">
        <Link href="/admin" className="text-sm font-semibold text-[#1d1d1f]">
          Gho&amp;Co <span className="text-[#86868b] font-normal">Admin</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center h-9 w-9 rounded-xl text-[#1d1d1f] hover:bg-[#f5f5f7]"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-[#d2d2d7] transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div>
            <Link href="/admin" className="text-sm font-semibold text-[#1d1d1f]">Gho&amp;Co</Link>
            <p className="mt-0.5 text-xs text-[#86868b]">Admin</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-center h-8 w-8 rounded-xl text-[#6e6e73] hover:bg-[#f5f5f7]"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-px bg-[#d2d2d7] mx-4" />

        <NavLinks onNavigate={() => setOpen(false)} />

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
    </>
  )
}
