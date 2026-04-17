import AnimatedLanding from './_landing/AnimatedLanding'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Gho&Co — Custom Shirts, 3D Prints & More',
  description: 'Custom printed shirts, 3D printed items, DIY projects, and custom lighting. Made exactly the way you want it.',
}

export default async function HomePage() {
  const supabase = createServiceClient()
  const { data: portfolioImages } = await supabase
    .from('portfolio_images')
    .select('id, generated_public_url, product_type')
    .eq('published', true)
    .not('generated_public_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(12)

  return <AnimatedLanding portfolioImages={portfolioImages ?? []} />
}
