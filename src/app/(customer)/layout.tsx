import { createClient } from '@/lib/supabase/server'
import { CustomerNav } from '@/components/layout/CustomerNav'

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = data
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <CustomerNav profile={profile} />
      <main>{children}</main>
      <footer className="mt-24 border-t border-[#d2d2d7] bg-white py-10 text-center">
        <p className="text-sm font-medium text-[#1d1d1f]">Gho&amp;Co</p>
        <p className="mt-1 text-sm text-[#86868b]">
          Custom shirts, 3D prints, DIY projects &amp; lighting
        </p>
        <p className="mt-2 text-xs text-[#86868b]">
          <a href="mailto:cg.designs08@gmail.com" className="hover:text-[#1d1d1f] transition-colors">
            cg.designs08@gmail.com
          </a>
        </p>
      </footer>
    </div>
  )
}
