// Playwright-based automation for the Fabrik.ca supplier website.
// Runs server-side only (local dev) — never imported by client components.
//
// Opens a VISIBLE browser window, adds all items to the cart, then leaves
// the window open. You log in manually and complete the purchase yourself.
// No credentials are stored anywhere.
//
// NOTE: This only works when running locally (npm run dev). A deployed server
// has no screen to show a browser window.

import { chromium } from 'playwright'
import { FABRIK_CART_URL, getFabrikProductUrl } from './fabrik-catalog'

export interface CartItem {
  style: string
  color: string
  colorHex: string
  size: string
  qty: number
}

export interface CartReadItem {
  description: string
  qty: number
}

export interface AutomationResult {
  success: boolean
  cartUrl: string
  cartItems: CartReadItem[]
  attempted: number
  error?: string
}

export async function runFabrikCartAutomation(items: CartItem[]): Promise<AutomationResult> {
  // Visible browser — user sees it open on their screen and can log in to pay
  const browser = await chromium.launch({ headless: false, slowMo: 150 })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()

  const grouped = groupByStyleAndColor(items)
  let attempted = 0

  try {
    for (const [styleColor, sizeQtys] of Object.entries(grouped)) {
      const [style, color, colorHex] = styleColor.split('|||')
      const productUrl = getFabrikProductUrl(style)
      if (!productUrl) continue

      await page.goto(productUrl, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(2000)

      // ── Select colour via hex match ────────────────────────────────────────
      // Fabrik.ca uses li.color[data-color="#hex"] swatches — click via evaluate
      // so Vue's reactivity picks up the event reliably.
      const colorClicked = await page.evaluate((hex) => {
        const swatch = document.querySelector(`li.color[data-color="${hex}"]`) as HTMLElement | null
        if (swatch) { swatch.click(); return true }
        // Fallback: find closest hex match
        const all = Array.from(document.querySelectorAll('li.color[data-color]')) as HTMLElement[]
        if (all.length === 0) return false
        all[0].click()
        return true
      }, colorHex)
      await page.waitForTimeout(1500)

      // ── DEBUG after colour click — capture what the form looks like now ─────
      if (attempted === 0) {
        const fs = await import('fs')
        const os = await import('os')
        await page.screenshot({ path: `${os.homedir()}/Desktop/fabrik-debug.png`, fullPage: true })
        const postClickHtml = await page.evaluate(() => {
          const form = document.querySelector('form.FormProduct')
          if (form) return form.innerHTML
          const table = document.querySelector('.product-selection-table')
          return table ? table.innerHTML.slice(0, 20000) : document.body.innerHTML.slice(5000, 25000)
        })
        fs.writeFileSync(`${os.homedir()}/Desktop/fabrik-debug.txt`, postClickHtml)
      }

      // ── Enter quantities per size ──────────────────────────────────────────
      // Build size → lineItems index map from the header row
      const sizeIndices: Record<string, number> = await page.evaluate(() => {
        const map: Record<string, number> = {}
        let colIdx = 0
        document.querySelectorAll('.row.header .col').forEach(col => {
          const txt = (col.textContent ?? '').trim().replace(/\u00a0/g, '')
          if (txt) { map[txt] = colIdx; colIdx++ }
        })
        return map
      })

      // Use Playwright's fill() so Vue's event listeners fire properly
      let anyQtyFilled = false
      for (const { size, qty } of sizeQtys) {
        const idx = sizeIndices[size]
        if (idx === undefined) continue
        const input = page.locator(`input[name="lineItems[${idx}][qty]"]`)
        if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
          await input.fill(String(qty))
          await page.waitForTimeout(150)
          anyQtyFilled = true
        }
      }

      // ── Add to cart ────────────────────────────────────────────────────────
      // Wait for Vue to enable the button after qty changes
      await page.waitForTimeout(1000)
      try {
        await page.locator('.submit-container button:not([disabled])').click({ timeout: 4000 })
        await page.waitForTimeout(2000)
        attempted++
      } catch {
        // Button stayed disabled — quantities may not have registered
      }
    }

    // ── Navigate to cart ───────────────────────────────────────────────────
    await page.goto(FABRIK_CART_URL, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForTimeout(1500)

    const cartItems = await readCart(page)

    // ── Proceed to checkout ────────────────────────────────────────────────
    // Try Playwright locators first (they handle any href containing "checkout")
    const checkoutLocator = page.locator('a[href*="checkout"], a[href*="checkouts"]').first()
    if (await checkoutLocator.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkoutLocator.click()
    } else {
      // Fallback: find any link/button with checkout text
      await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('a, button'))
          .find(e => /checkout/i.test(e.textContent ?? '')) as HTMLElement | null
        el?.click()
      })
    }
    await page.waitForTimeout(1500)

    // Leave browser open — user enters payment info
    // (do NOT call browser.close())

    return { success: true, cartUrl: FABRIK_CART_URL, cartItems, attempted }
  } catch (err: any) {
    // On error, still leave the browser open so the user can see what happened
    return {
      success: false,
      cartUrl: FABRIK_CART_URL,
      cartItems: [],
      attempted,
      error: err.message ?? 'Unknown automation error',
    }
  }
}

async function readCart(page: any): Promise<CartReadItem[]> {
  const items: CartReadItem[] = []

  // Try several cart row patterns
  const rowSelectors = [
    '.cart-item',
    '.cart.item',
    'tr.item-info',
    '[data-testid="cart-item"]',
    '.line-item',
  ]

  for (const rowSel of rowSelectors) {
    const rows = await page.locator(rowSel).all().catch(() => [])
    if (rows.length === 0) continue

    for (const row of rows) {
      const description = await row
        .locator('.product-item-name, .product-name, .item-name, td.col.item, [data-testid="item-name"]')
        .textContent()
        .catch(() => '')
      const qtyText = await row
        .locator('input.qty, input[name*="qty"], input[data-testid="qty"]')
        .inputValue()
        .catch(() => '0')
      const qty = parseInt(qtyText) || 0
      if (description && qty > 0) {
        items.push({ description: description.trim(), qty })
      }
    }
    break
  }

  return items
}

function groupByStyleAndColor(items: CartItem[]): Record<string, { size: string; qty: number }[]> {
  const groups: Record<string, { size: string; qty: number }[]> = {}
  for (const item of items) {
    const key = `${item.style}|||${item.color}|||${item.colorHex}`
    if (!groups[key]) groups[key] = []
    groups[key].push({ size: item.size, qty: item.qty })
  }
  return groups
}
