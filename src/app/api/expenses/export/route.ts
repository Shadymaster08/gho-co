import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'

export const runtime = 'nodejs'

const CATEGORY_LABELS: Record<string, string> = {
  supplies: 'Supplies',
  membership: 'Membership',
  tools_equipment: 'Tools & Equipment',
  other: 'Other',
}

function displayName(p: { full_name: string | null; email: string } | undefined | null) {
  if (!p) return '—'
  return p.full_name ?? p.email
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = createServiceClient()
  const { data: expenses } = await service
    .from('expenses')
    .select('*, profiles!expenses_paid_by_fkey(email, full_name), expense_splits(*, profiles(email, full_name))')
    .order('date', { ascending: false })

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Gho&Co'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Expenses', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  // Column definitions
  sheet.columns = [
    { header: 'EXP #',       key: 'number',      width: 18 },
    { header: 'Title',       key: 'title',        width: 28 },
    { header: 'Category',    key: 'category',     width: 18 },
    { header: 'Date',        key: 'date',         width: 14 },
    { header: 'Amount ($)',  key: 'amount',       width: 14 },
    { header: 'Paid By',     key: 'paid_by',      width: 24 },
    { header: 'Status',      key: 'status',       width: 12 },
    { header: 'Description', key: 'description',  width: 36 },
    { header: 'Splits',      key: 'splits',       width: 42 },
    { header: 'Receipt',     key: 'receipt',      width: 22 },
  ]

  // Header styling
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 22

  const IMAGE_ROW_HEIGHT = 80

  for (const expense of expenses ?? []) {
    const splits: any[] = expense.expense_splits ?? []
    const splitsText = splits.map(s => {
      const name = displayName(s.profiles)
      const share = `$${(s.share_cents / 100).toFixed(2)}`
      const status = s.is_reimbursed
        ? `✓ reimbursed${s.reimbursed_at ? ` ${s.reimbursed_at.slice(0, 10)}` : ''}`
        : 'pending'
      return `${name}: ${share} (${status})`
    }).join('\n')

    const hasReceipt = !!expense.receipt_url

    const row = sheet.addRow({
      number:      expense.expense_number,
      title:       expense.title,
      category:    CATEGORY_LABELS[expense.category] ?? expense.category,
      date:        expense.date,
      amount:      (expense.amount_cents / 100).toFixed(2),
      paid_by:     displayName((expense as any).profiles),
      status:      expense.status === 'settled' ? 'Settled' : 'Open',
      description: expense.description ?? '',
      splits:      splitsText,
      receipt:     hasReceipt ? expense.receipt_url : '',
    })

    row.height = hasReceipt ? IMAGE_ROW_HEIGHT : 18
    row.alignment = { vertical: 'top', wrapText: true }

    // Amount: right-align, formatted
    row.getCell('amount').numFmt = '$#,##0.00'
    row.getCell('amount').value = expense.amount_cents / 100
    row.getCell('amount').alignment = { horizontal: 'right', vertical: 'top' }

    // Status color
    const statusCell = row.getCell('status')
    if (expense.status === 'settled') {
      statusCell.font = { color: { argb: 'FF16A34A' }, bold: true }
    } else {
      statusCell.font = { color: { argb: 'FFD97706' }, bold: true }
    }

    // Category color
    const catColors: Record<string, string> = {
      supplies: 'FF1D4ED8', membership: 'FF7C3AED',
      tools_equipment: 'FFEA580C', other: 'FF6B7280',
    }
    row.getCell('category').font = { color: { argb: catColors[expense.category] ?? 'FF374151' } }

    // Embed receipt image if available
    if (expense.receipt_url) {
      try {
        const imgRes = await fetch(expense.receipt_url)
        if (imgRes.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const imgBuf: any = Buffer.from(await imgRes.arrayBuffer())
          const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
          const ext = (contentType.includes('png') ? 'png' : 'jpeg') as 'png' | 'jpeg'

          const imageId = workbook.addImage({ buffer: imgBuf, extension: ext })
          const rowIndex = row.number - 1

          sheet.addImage(imageId, {
            tl: { col: 9, row: rowIndex } as ExcelJS.Anchor,
            br: { col: 10, row: rowIndex + 1 } as ExcelJS.Anchor,
            editAs: 'oneCell',
          })
          // Clear the text in receipt cell since image covers it
          row.getCell('receipt').value = ''
        }
      } catch {
        // Keep URL as text fallback
        row.getCell('receipt').value = { text: 'View receipt', hyperlink: expense.receipt_url }
        row.getCell('receipt').font = { color: { argb: 'FF4F46E5' }, underline: true }
      }
    }
  }

  // Alternating row colors (skip header)
  sheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return
    const fill: ExcelJS.Fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: rowNum % 2 === 0 ? 'FFF9FAFB' : 'FFFFFFFF' },
    }
    row.eachCell(cell => {
      if (!cell.fill || (cell.fill as any).fgColor?.argb === undefined) {
        cell.fill = fill
      }
    })
  })

  // Add a summary sheet
  const summary = workbook.addWorksheet('Summary')
  summary.columns = [
    { header: 'Category', key: 'cat', width: 22 },
    { header: 'Total ($)', key: 'total', width: 14 },
    { header: 'Count', key: 'count', width: 10 },
    { header: 'Outstanding ($)', key: 'outstanding', width: 18 },
  ]
  const sumHeader = summary.getRow(1)
  sumHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  sumHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }
  sumHeader.height = 22

  const byCategory: Record<string, { total: number; count: number; outstanding: number }> = {}
  for (const expense of expenses ?? []) {
    const cat = CATEGORY_LABELS[expense.category] ?? expense.category
    if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0, outstanding: 0 }
    byCategory[cat].total += expense.amount_cents
    byCategory[cat].count += 1
    const splits: any[] = expense.expense_splits ?? []
    byCategory[cat].outstanding += splits
      .filter(s => !s.is_reimbursed)
      .reduce((sum, s) => sum + s.share_cents, 0)
  }

  for (const [cat, vals] of Object.entries(byCategory)) {
    const r = summary.addRow({
      cat,
      total: vals.total / 100,
      count: vals.count,
      outstanding: vals.outstanding / 100,
    })
    r.getCell('total').numFmt = '$#,##0.00'
    r.getCell('outstanding').numFmt = '$#,##0.00'
    r.height = 18
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const date = new Date().toISOString().slice(0, 10)

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="expenses-${date}.xlsx"`,
    },
  })
}
