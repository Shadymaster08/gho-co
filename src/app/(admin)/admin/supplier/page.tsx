'use client'

import { ExternalLink, Shirt, Box, Lightbulb, Wrench } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { PricingCalculator } from '@/components/admin/PricingCalculator'
import { PriceCheckPanel } from '@/components/admin/PriceCheckPanel'
import { SupplierScoutPanel } from '@/components/admin/SupplierScoutPanel'

const suppliers = [
  {
    name: 'Fabrik.ca',
    description: 'Blank apparel — t-shirts, hoodies, crewnecks, polos, and more. Canadian wholesale supplier.',
    href: 'https://fabrik.ca/',
    products: ['T-shirts from ~$3.10/unit', 'Hoodies from ~$18/unit', 'Crewnecks from ~$14/unit', 'Size upcharges: 2XL +$1.00, 3XL +$2.00'],
    category: 'Shirts',
    icon: Shirt,
    color: 'bg-indigo-50 text-indigo-600',
  },
  {
    name: 'Ninja Transfers',
    description: 'DTF (Direct-to-Film) printing. No minimums, $0.02/sq inch. Ships ready-to-press transfers.',
    href: 'https://ninjatransfers.com/',
    products: ['$0.02 per square inch', 'No minimum order', '12"×12" print ≈ $2.88', 'Glitter, puff, foil, glow-in-dark finishes available'],
    category: 'Shirts (Print)',
    icon: Shirt,
    color: 'bg-pink-50 text-pink-600',
  },
  {
    name: 'Bambu Lab Filament',
    description: 'High-quality filament for 3D printing. PLA, PETG, ABS, TPU, ASA, and specialty materials.',
    href: 'https://ca.store.bambulab.com/collections/bambu-lab-3d-printer-filament',
    products: ['PLA (Bambu) ≈ $29/kg', 'PETG ≈ $22/kg', 'ABS ≈ $24/kg', 'TPU ≈ $32/kg', '1kg and 4kg spools'],
    category: '3D Prints',
    icon: Box,
    color: 'bg-emerald-50 text-emerald-600',
  },
]

export default function SupplierPage() {
  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        <p className="mt-1 text-sm text-gray-500">
          Reference your material costs here, then use the pricing calculator to generate quotes with a 35% margin.
        </p>
      </div>

      {/* Supplier cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {suppliers.map(({ name, description, href, products, category, icon: Icon, color }) => (
          <div key={name} className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
              >
                Open site <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <h3 className="font-semibold text-gray-900">{name}</h3>
            <p className="mt-1 text-xs text-gray-500">{description}</p>
            <ul className="mt-3 flex flex-col gap-1">
              {products.map(p => (
                <li key={p} className="text-xs text-gray-600 before:mr-1.5 before:content-['·']">{p}</li>
              ))}
            </ul>
            <span className="mt-auto pt-3 text-xs font-medium text-gray-400">Used for: {category}</span>
          </div>
        ))}
      </div>

      {/* Workflow */}
      <Card className="mt-8" header={<span className="font-semibold text-gray-900">Fulfillment workflow</span>}>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Shirt className="h-4 w-4 text-indigo-500" /> Custom Shirts
            </h4>
            <ol className="flex flex-col gap-2 text-sm text-gray-600">
              <li className="flex gap-2"><span className="font-bold text-indigo-600">1.</span> Order blank shirts from <a href="https://fabrik.ca/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Fabrik.ca</a></li>
              <li className="flex gap-2"><span className="font-bold text-indigo-600">2.</span> Order DTF transfers from <a href="https://ninjatransfers.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Ninja Transfers</a> (upload customer artwork)</li>
              <li className="flex gap-2"><span className="font-bold text-indigo-600">3.</span> Heat-press the transfer onto the shirt</li>
              <li className="flex gap-2"><span className="font-bold text-indigo-600">4.</span> Ship or hand off to customer</li>
            </ol>
          </div>
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Box className="h-4 w-4 text-emerald-500" /> 3D Prints
            </h4>
            <ol className="flex flex-col gap-2 text-sm text-gray-600">
              <li className="flex gap-2"><span className="font-bold text-emerald-600">1.</span> Order filament from <a href="https://ca.store.bambulab.com/collections/bambu-lab-3d-printer-filament" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">Bambu Lab</a> if needed</li>
              <li className="flex gap-2"><span className="font-bold text-emerald-600">2.</span> Slice and print from customer STL file (or your design)</li>
              <li className="flex gap-2"><span className="font-bold text-emerald-600">3.</span> Post-process (supports, sanding, painting)</li>
              <li className="flex gap-2"><span className="font-bold text-emerald-600">4.</span> Ship or hand off to customer</li>
            </ol>
          </div>
        </div>
      </Card>

      {/* Supplier Scout agent */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-[#1d1d1f]">Supplier Scout</h2>
        <SupplierScoutPanel />
      </div>

      {/* Price check agent */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-[#1d1d1f]">Supplier Price Monitor</h2>
        <PriceCheckPanel />
      </div>

      {/* Pricing calculator */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Pricing Calculator</h2>
        <p className="mb-4 text-sm text-gray-500">
          Calculate your selling price with a 35% gross margin. Use &ldquo;Apply to quote&rdquo; from the order detail page to pre-fill the quote builder.
        </p>

        <div className="grid gap-6 lg:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Shirts</p>
            <PricingCalculator productType="shirt" />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-gray-400">3D Prints</p>
            <PricingCalculator productType="3d_print" />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-gray-400">DIY / Lighting</p>
            <PricingCalculator productType="diy" />
          </div>
        </div>
      </div>
    </div>
  )
}
