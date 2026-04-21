export type Role = 'customer' | 'admin'

export type ProductType = 'shirt' | '3d_print' | 'diy' | 'lighting'

export type OrderStatus =
  | 'received'
  | 'in_review'
  | 'quoted'
  | 'approved'
  | 'in_production'
  | 'shipped'
  | 'complete'
  | 'cancelled'

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'voided'

export type FileType = 'front_artwork' | 'back_artwork' | 'stl' | 'reference'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: Role
  created_at: string
  updated_at: string
}

// ---------- Order configuration shapes ----------

export interface ShirtSize {
  size: 'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL'
  quantity: number
}

export type ShirtStyle = 'tshirt' | 'longsleeve' | 'crewneck' | 'hoodie' | 'ziphoodie'

export interface ColorGroup {
  color: string
  sizes: ShirtSize[]
}

export interface StyleGroup {
  shirt_style: ShirtStyle
  color_groups: ColorGroup[]
}

export interface ShirtConfig {
  // Multi-style (new) — takes precedence when present
  style_groups?: StyleGroup[]
  // Legacy single-style — kept for backward compat
  shirt_style?: ShirtStyle
  color_groups?: ColorGroup[]
  front_file_path: string | null
  back_file_path: string | null
  front_file_url: string | null
  back_file_url: string | null
  dtf_front_width: number | null
  dtf_front_height: number | null
  dtf_back_width: number | null
  dtf_back_height: number | null
  printful_variant_id: number | null
}

export interface PrintConfig {
  mode: 'upload' | 'consultation'
  stl_file_path: string | null
  stl_file_url: string | null
  material: string
  color: string
  quantity: number
  description: string
}

export interface ConsultationConfig {
  description: string
  dimensions: string
  reference_images: string[]
}

export type OrderConfiguration = ShirtConfig | PrintConfig | ConsultationConfig

export interface Order {
  id: string
  order_number: string
  customer_id: string
  product_type: ProductType
  status: OrderStatus
  configuration: OrderConfiguration
  customer_notes: string | null
  admin_notes: string | null
  printful_order_id: string | null
  printful_status: string | null
  created_at: string
  updated_at: string
  // joined
  profiles?: Profile
  quotes?: Quote[]
  invoices?: Invoice[]
}

// ---------- Quote / Invoice ----------

export interface LineItem {
  id: string
  description: string
  quantity: number
  unit_price_cents: number
  total_cents: number
}

export interface Quote {
  id: string
  quote_number: string
  order_id: string
  created_by: string
  status: QuoteStatus
  line_items: LineItem[]
  subtotal_cents: number
  tax_rate: number
  tax_cents: number
  total_cents: number
  currency: string
  valid_until: string | null
  notes: string | null
  internal_notes: string | null
  material_cost_cents: number
  margin_percent: number | null
  sent_at: string | null
  accepted_at: string | null
  declined_at: string | null
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  invoice_number: string
  order_id: string
  quote_id: string | null
  created_by: string
  status: InvoiceStatus
  line_items: LineItem[]
  subtotal_cents: number
  tax_rate: number
  tax_cents: number
  total_cents: number
  currency: string
  due_date: string | null
  notes: string | null
  payment_instructions: string | null
  paid_at: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

export interface OrderFile {
  id: string
  order_id: string
  file_type: FileType
  storage_path: string
  file_name: string
  file_size_bytes: number | null
  mime_type: string | null
  created_at: string
}
