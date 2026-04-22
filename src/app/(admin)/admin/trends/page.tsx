import { EtsyTrendsPanel } from '@/components/admin/EtsyTrendsPanel'

export const dynamic = 'force-dynamic'

export default function TrendsPage() {
  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-[#1d1d1f]">Trends</h1>
        <p className="mt-1 text-sm text-[#86868b]">
          Etsy bestseller analysis to help you decide what to create next. Claude browses the top listings
          in each of your four product categories and surfaces design ideas tailored to what Gho&amp;Co can
          actually make.
        </p>
      </div>

      <div className="mt-6">
        <EtsyTrendsPanel />
      </div>
    </div>
  )
}
