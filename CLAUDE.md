# CLAUDE.md — Gho&Co Custom Shop

This file captures the full project context so any session can pick up exactly where the last one left off.

---

## Project

**Gho&Co** — a full-stack custom shop web app for a small Canadian business that produces:
- Custom printed shirts (blank shirts + DTF heat-press transfers)
- 3D printed items (Bambu A1 printer)
- DIY projects
- Custom lighting

Customers submit orders online. The admin reviews, quotes, invoices, and fulfils them in-house.

**Repo root:** `/Users/chady/Desktop/ClaudeCodeTest/shop/`
**Dev server:** `npm run dev` → `http://localhost:3000`
**Admin dashboard:** `http://localhost:3000/admin`

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 14 (App Router + TypeScript) |
| Database + Auth + Storage | Supabase |
| Styling | Tailwind CSS (Apple design system) |
| Font | Sora (via `next/font/google`, CSS var `--font-sora`) |
| Email | Resend (`onboarding@resend.dev` — no domain yet) |
| Icons | lucide-react |
| Browser automation | Playwright (local dev only) |

---

## Design System (Apple-inspired)

| Token | Value |
|---|---|
| Background | `#f5f5f7` |
| Surface | `#ffffff` |
| Text | `#1d1d1f` |
| Secondary text | `#86868b` |
| Border | `#d2d2d7` |
| Blue | `#0071e3` |
| Blue hover | `#0077ed` |

- All buttons are `rounded-full` pill shape
- Nav is frosted glass: `bg-white/80 backdrop-blur-xl`
- Cards use `rounded-2xl border border-[#d2d2d7]`
- Hover states: `hover:-translate-y-0.5 transition-all`

---

## Environment Variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://soxptfxjornhtpejmohj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=re_CveQyGTw_H5JoKmzcRX2rSE2FvXrm9CqB
RESEND_FROM_EMAIL=onboarding@resend.dev
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_NOTIFY_EMAIL=cg.designs08@gmail.com
```

---

## Supabase Migrations (run in order in SQL Editor)

| File | Status | What it creates |
|---|---|---|
| `supabase/migrations/001_initial_schema.sql` | Done | profiles, orders, order_files, quotes, invoices, email_log, RLS, triggers |
| `supabase/migrations/002_sequences.sql` | Done | order_number / quote_number / invoice_number sequences |
| `supabase/migrations/003_pricing_config.sql` | Done | `price_configs` table + 11 seeded supplier prices |
| `supabase/migrations/004_supplier_scout.sql` | Done | `supplier_scout_reports` table |
| `supabase/migrations/005_storage_bucket.sql` | Done | `order-files` storage bucket + RLS policies for artwork/STL uploads |

---

## Product Lines & Order Forms

### Shirts (`/order/shirts`)
- Product types: T-Shirt (G5000), Long Sleeve (G5400), Crewneck (G18000), Hoodie (G18500), Zip Hoodie (G18600)
- **Multi-color orders**: customers pick multiple color groups in a single order (e.g. 10 White + 5 Navy + 3 Black), each with its own size quantities. State: `colorGroups: ColorGroupState[]`
- All Fabrik.ca colours with swatch picker (luminance-based border for light colours)
- Sizes: XS–3XL with quantity per size per color group
- DTF inputs: W" × H" for front and back print
- Artwork upload via `useUpload` hook → presign → Supabase Storage (`order-files` bucket)
- Custom quote section at bottom for non-standard requests

### 3D Prints (`/order/3d-prints`)
- Mode: upload STL or consultation
- Materials: PLA Basic, PLA Matte, PLA Silk, PETG, TPU (Bambu A1 compatible only)
- Quantity field

### DIY & Lighting (`/order/diy`, `/order/lighting`)
- Consultation form with description, dimensions, budget field
- Reference image uploads (up to 5, via Supabase Storage)

---

## Types (`src/types/index.ts`)

### ShirtConfig
```typescript
export interface ColorGroup {
  color: string      // e.g. "White", "Navy"
  sizes: ShirtSize[] // [{ size: 'M', quantity: 5 }, ...]
}

export interface ShirtConfig {
  shirt_style: ShirtStyle
  color_groups: ColorGroup[]   // replaces old shirt_color + sizes fields
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
```

**Backwards compatibility**: old orders have `shirt_color + sizes` at root. Use `normalizeShirtConfig(config)` from `src/lib/pricing.ts` to convert both formats to `{ color_groups }` before processing.

---

## Pricing Logic (`src/lib/pricing.ts`)

Shared between frontend calculator and backend agents:
- Margin: 35% (`MULTIPLIER = 1 / (1 - 0.35)`)
- Labor: $50/hr, 10 shirts/hr
- Overhead: 15% on shirts
- Shirt costs: tshirt $3.10, longsleeve $6.50, crewneck $14.00, hoodie/ziphoodie $18.00
- DTF: $0.02/sq in
- Filament: PLA Basic/Matte $29/kg, PLA Silk $32/kg, PETG $22/kg, TPU $32/kg
- `normalizeShirtConfig(config)` — converts legacy `shirt_color+sizes` OR new `color_groups` format into `{ color_groups }`
- `calcShirtOrder()` — uses `normalizeShirtConfig`, sums across all color groups, generates description like "Custom T-Shirt ×18 (White ×10, Navy ×5, Black ×3)"

---

## File Uploads (`src/hooks/useUpload.ts`)

- `useUpload()` returns `{ uploadFile, progress, uploading }`
- Signature: `uploadFile(file, fileType, orderId)` — `orderId` passed directly (not via hook state) to avoid stale closure bugs
- Flow: POST `/api/uploads/presign` → get signed URL → XHR PUT to Supabase Storage with progress tracking
- Presign route (`/api/uploads/presign`) uses `createServiceClient()` (service role key) for `createSignedUploadUrl` — anon key doesn't have storage admin rights
- Bucket: `order-files` (public, 100MB limit, PNG/JPEG/WebP/STL)

---

## Supabase Client (`src/lib/supabase/server.ts`)

- `createClient()` — SSR client with cookies, uses anon key (respects RLS)
- `createServiceClient()` — plain `createClient` from `@supabase/supabase-js` with service role key, bypasses RLS. **Must use this for storage operations and any admin-only DB writes that need to bypass RLS.**

---

## Hive-Mind Agent Architecture

All agents live at `src/app/api/agents/`. All require admin auth.

### Agent 1 — Quote Auto-Draft (`/api/agents/quote-draft`)
- **POST** `{ order_id }` → calculates pricing → inserts draft quote → returns `{ quote_id }`
- Triggered from order detail page via "Auto-generate quote" button
- Uses `createServiceClient()` to bypass RLS on insert

### Agent 2 — Follow-Up Monitor (`/api/agents/follow-up`)
- **GET** → scans for stale quotes (48h), stuck orders (3+ days), overdue invoices
- Displayed in `FollowUpFlags` component on admin dashboard

### Agent 3 — Price Check (`/api/agents/price-check`)
- **GET/POST/PUT** — view/update/verify `price_configs`
- UI: `PriceCheckPanel` on `/admin/supplier`

### Agent 4 — Supplier Scout (`/api/agents/supplier-scout`)
- **GET/POST** — compare prices vs 14 vetted alternatives, email findings
- UI: `SupplierScoutPanel` on `/admin/supplier`
- Run every 2–4 weeks

### Agent 5 — Supplier Cart Automation (`/api/agents/supplier-cart`)
- **POST** `{ quoteId }` → admin only
- Opens a **visible Playwright browser** (headless: false), navigates to Fabrik.ca product pages, selects colours by hex (`li.color[data-color="#hex"]`), fills size quantities using `input[name="lineItems[N][qty]"]`, clicks "Add to cart", then navigates to cart → checkout
- No credentials stored — browser stays open for manual login + payment
- Returns `{ success, cartUrl, manifest, validation }` with per-item match/wrong_qty/missing status
- **Only works locally** (needs a display for the browser window)
- Fabrik.ca site structure: Vue.js + Craft Commerce. Form: `form.FormProduct`, qty inputs: `lineItems[N][qty]`, colour swatches: `li.color[data-color]`

---

## Supplier Catalog (`src/lib/supplier/`)

- `fabrik-catalog.ts` — maps `shirt_style` → Fabrik.ca product URL, color name → hex (`getColorHex(name)`)
- `fabrik-automation.ts` — Playwright automation. `CartItem` has `{ style, color, colorHex, size, qty }`

---

## Key Components

| Component | Path | Notes |
|---|---|---|
| `FollowUpFlags` | `src/components/admin/FollowUpFlags.tsx` | Client, auto-runs on mount |
| `PriceCheckPanel` | `src/components/admin/PriceCheckPanel.tsx` | Client, inline price editing |
| `SupplierScoutPanel` | `src/components/admin/SupplierScoutPanel.tsx` | Client, run scout + history |
| `PricingCalculator` | `src/components/admin/PricingCalculator.tsx` | Manual quote calculator |
| `SupplierCartButton` | `src/components/admin/SupplierCartButton.tsx` | Client, triggers cart automation, shows manifest + validation modal |
| `DeleteButton` | `src/components/admin/DeleteButton.tsx` | Client, reusable delete with confirm dialog. Props: `apiPath`, `redirectTo`, `label`, `confirmMessage`, `variant` ('icon' or 'button') |
| `CustomerNav` | `src/components/layout/CustomerNav.tsx` | Frosted glass sticky nav |
| `AdminSidebar` | `src/components/layout/AdminSidebar.tsx` | Minimal Apple-style sidebar |
| `Button` | `src/components/ui/Button.tsx` | Pill-shaped, Apple blue primary |

---

## Admin Routes

| Route | What it does |
|---|---|
| `/admin` | Dashboard: stats, FollowUpFlags, recent orders |
| `/admin/orders` | Filterable orders table + delete icon per row |
| `/admin/orders/[id]` | Order detail + save/generate quote/delete buttons, shirt config display with per-color breakdown |
| `/admin/quotes` | Quotes list + delete icon per row |
| `/admin/quotes/[id]` | Quote detail + send/delete + SupplierCartButton (shirt orders only) |
| `/admin/invoices` | Invoices list |
| `/admin/invoices/[id]` | Invoice detail + send + mark paid |
| `/admin/supplier` | Supplier Scout + Price Monitor + Pricing Calculator |

---

## Delete Functionality

- **Orders**: `DELETE /api/orders/[orderId]` — admin only, uses service client, cascades to quotes/invoices/order_files
- **Quotes**: `DELETE /api/quotes/[quoteId]` — admin only, any status
- `DeleteButton` component handles confirmation, DELETE call, toast, and redirect

---

## Pending / Next Steps

- [ ] **Agent 6** — Daily Digest: morning summary email (revenue, orders by status, what needs action)
- [ ] **Agent 7** — Profit Estimator: when quote is accepted, checks if margin has slipped vs current `price_configs`
- [ ] **Vercel deployment**: add `vercel.json` with `rootDirectory: "shop"`
- [ ] **Email domain**: add DNS records in Resend when ready (currently using `onboarding@resend.dev`)
- [ ] **Printful integration**: catalog picker + order trigger + webhook at `/api/webhooks/printful`
- [ ] Connect `price_configs` live values into `src/lib/pricing.ts` calculations (currently hardcoded)
- [ ] Verify Fabrik.ca Playwright selectors against live site (marked with TODO comments in `fabrik-automation.ts`)

---

## How to Resume

```bash
cd /Users/chady/Desktop/ClaudeCodeTest/shop
npm run dev
# open http://localhost:3000/admin
```

Admin account: promote with `UPDATE profiles SET role='admin' WHERE email='your@email.com';` in Supabase SQL editor.
