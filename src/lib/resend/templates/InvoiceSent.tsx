import { formatCurrency, formatDate } from '@/lib/utils'

interface InvoiceSentProps {
  customer_name: string
  invoice_number: string
  total_cents: number
  due_date: string | null
  payment_instructions: string | null
  invoice_url: string
  line_items: Array<{ description: string; quantity: number; total_cents: number }>
}

export function InvoiceSent({ customer_name, invoice_number, total_cents, due_date, payment_instructions, invoice_url, line_items }: InvoiceSentProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 560, margin: '0 auto', color: '#111827' }}>
      <div style={{ backgroundColor: '#4f46e5', padding: '24px', borderRadius: '8px 8px 0 0' }}>
        <h1 style={{ color: 'white', margin: 0, fontSize: 20 }}>Gho&Co</h1>
      </div>

      <div style={{ padding: '24px', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
        <p>Hi {customer_name},</p>
        <p>Your invoice <strong>{invoice_number}</strong> is ready.</p>

        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '16px 0' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 13, color: '#6b7280' }}>Description</th>
              <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 13, color: '#6b7280' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 13, color: '#6b7280' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {line_items.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 0', fontSize: 14 }}>{item.description}</td>
                <td style={{ textAlign: 'right', padding: '8px 0', fontSize: 14, color: '#6b7280' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right', padding: '8px 0', fontSize: 14 }}>{formatCurrency(item.total_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ textAlign: 'right', fontSize: 18, fontWeight: 'bold' }}>Total: {formatCurrency(total_cents)}</p>
        {due_date && <p style={{ color: '#dc2626', fontSize: 13 }}>Due date: {formatDate(due_date)}</p>}

        {payment_instructions && (
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 16, margin: '16px 0' }}>
            <p style={{ fontWeight: 'bold', margin: '0 0 8px' }}>How to pay</p>
            <p style={{ margin: 0, whiteSpace: 'pre-line', fontSize: 14 }}>{payment_instructions}</p>
          </div>
        )}

        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <a
            href={invoice_url}
            style={{ backgroundColor: '#4f46e5', color: 'white', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontWeight: 'bold', display: 'inline-block' }}
          >
            View Invoice
          </a>
        </div>
      </div>
    </div>
  )
}
