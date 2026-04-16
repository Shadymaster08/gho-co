import { formatCurrency, formatDate } from '@/lib/utils'

interface QuoteSentProps {
  customer_name: string
  order_number: string
  quote_number: string
  total_cents: number
  valid_until: string | null
  quote_url: string
  line_items: Array<{ description: string; quantity: number; unit_price_cents: number; total_cents: number }>
}

export function QuoteSent({ customer_name, order_number, quote_number, total_cents, valid_until, quote_url, line_items }: QuoteSentProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 560, margin: '0 auto', color: '#111827' }}>
      <div style={{ backgroundColor: '#4f46e5', padding: '24px', borderRadius: '8px 8px 0 0' }}>
        <h1 style={{ color: 'white', margin: 0, fontSize: 20 }}>Gho&Co</h1>
      </div>

      <div style={{ padding: '24px', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
        <p>Hi {customer_name},</p>
        <p>We have prepared a quote for your order <strong>{order_number}</strong>. Here is a summary:</p>

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

        {valid_until && <p style={{ color: '#6b7280', fontSize: 13 }}>This quote is valid until {formatDate(valid_until)}.</p>}

        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <a
            href={quote_url}
            style={{ backgroundColor: '#4f46e5', color: 'white', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontWeight: 'bold', display: 'inline-block' }}
          >
            View &amp; Accept Quote
          </a>
        </div>

        <p style={{ fontSize: 13, color: '#6b7280' }}>
          Questions? Reply to this email or contact us at <a href="mailto:cg.designs08@gmail.com">cg.designs08@gmail.com</a>
        </p>
      </div>
    </div>
  )
}
