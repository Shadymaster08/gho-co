'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

export function CustomerNav({ profile }: { profile: Profile | null }) {
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="print:hidden sticky top-0 z-40 border-b border-[#d2d2d7]/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-base font-semibold tracking-tight text-[#1d1d1f]">
          Gho&amp;Co
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-[#6e6e73] sm:flex">
          <Link href="/#products" className="transition-colors hover:text-[#1d1d1f]">Products</Link>
          {profile && (
            <Link href="/portal" className="transition-colors hover:text-[#1d1d1f]">My Orders</Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {profile ? (
            <>
              <span className="hidden text-sm text-[#86868b] sm:block">
                {profile.full_name ?? profile.email}
              </span>
              <button
                onClick={signOut}
                className="text-sm text-[#6e6e73] transition-colors hover:text-[#1d1d1f]"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-[#6e6e73] transition-colors hover:text-[#1d1d1f]">
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-[#0071e3] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#0077ed]"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
