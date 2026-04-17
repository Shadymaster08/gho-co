import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PortfolioClient from './PortfolioClient'

export const metadata = { title: 'Portfolio — Admin' }

export default async function AdminPortfolioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/portal')

  const { data: images } = await supabase
    .from('portfolio_images')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1d1d1f]">Portfolio</h1>
        <p className="mt-1 text-sm text-[#86868b]">
          Upload product shots. Claude analyzes each photo and Flux regenerates it in the Gho&amp;Co brand aesthetic.
        </p>
      </div>
      <PortfolioClient initial={images ?? []} />
    </div>
  )
}
