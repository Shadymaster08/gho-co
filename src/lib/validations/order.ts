import { z } from 'zod'

const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] as const

export const shirtOrderSchema = z.object({
  product_type: z.literal('shirt'),
  customer_notes: z.string().max(1000).optional(),
  configuration: z.object({
    sizes: z.array(z.object({
      size: z.enum(SHIRT_SIZES),
      quantity: z.number().int().min(0),
    })).refine(sizes => sizes.some(s => s.quantity > 0), {
      message: 'At least one size must have a quantity greater than 0',
    }),
    front_file_path: z.string().min(1, 'Front artwork is required'),
    back_file_path: z.string().nullable().optional(),
    front_file_url: z.string().url().nullable().optional(),
    back_file_url: z.string().url().nullable().optional(),
    shirt_color: z.string().min(1),
    printful_variant_id: z.number().nullable().optional(),
  }),
})

export const printOrderSchema = z.object({
  product_type: z.literal('3d_print'),
  customer_notes: z.string().max(1000).optional(),
  configuration: z.object({
    mode: z.enum(['upload', 'consultation']),
    stl_file_path: z.string().nullable().optional(),
    stl_file_url: z.string().nullable().optional(),
    material: z.string().min(1),
    color: z.string().min(1),
    quantity: z.number().int().min(1),
    description: z.string().max(2000).optional(),
  }).refine(config => {
    if (config.mode === 'upload') return !!config.stl_file_path
    if (config.mode === 'consultation') return !!config.description && config.description.length > 10
    return false
  }, { message: 'Please upload an STL file or describe your project' }),
})

export const consultationOrderSchema = z.object({
  product_type: z.enum(['diy', 'lighting']),
  customer_notes: z.string().max(1000).optional(),
  configuration: z.object({
    description: z.string().min(10, 'Please describe your project in at least 10 characters').max(2000),
    dimensions: z.string().max(200).optional(),
    reference_images: z.array(z.string()).optional(),
  }),
})

export const orderSchema = z.discriminatedUnion('product_type', [
  shirtOrderSchema,
  printOrderSchema,
  z.object({ product_type: z.literal('diy'), ...consultationOrderSchema.omit({ product_type: true }).shape }),
  z.object({ product_type: z.literal('lighting'), ...consultationOrderSchema.omit({ product_type: true }).shape }),
])
