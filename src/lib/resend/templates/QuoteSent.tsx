import { formatCurrency, formatDate } from '@/lib/utils'

interface QuoteSentProps {
  customer_name: string
  order_number: string
  quote_number: string
  total_cents: number
  valid_until: string | null
  quote_url: string
  line_items: Array<{ description: string; quantity: number; unit_price_cents: number; total_cents: number }>
  mockup_front_url?: string
  mockup_back_url?: string
}

export function QuoteSent({ customer_name, order_number, quote_number, total_cents, valid_until, quote_url, line_items, mockup_front_url, mockup_back_url }: QuoteSentProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 560, margin: '0 auto', color: '#111827', backgroundColor: '#ffffff' }}>
      {/* Header */}
      <div style={{ padding: '28px 32px 20px', borderBottom: '2px solid #f3f4f6' }}>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.5px' }}>Gho&amp;Co</p>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Custom printing &amp; design</p>
      </div>

      {/* Body */}
      <div style={{ padding: '28px 32px' }}>
        <p style={{ marginTop: 0 }}>Hi {customer_name},</p>
        <p>We have prepared a quote for your order <strong>{order_number}</strong>. Please review the details below and click the button to view and accept it online.</p>

        {/* Line items table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0', fontSize: 14 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 0', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Description</th>
              <th style={{ textAlign: 'center', padding: '6px 0', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb', width: 48 }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '6px 0', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb', width: 80 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {line_items.map((item, i) => (
              <tr key={i}>
                <td style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>{item.description}</td>
                <td style={{ textAlign: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right', padding: '10px 0', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>{formatCurrency(item.total_cents)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} style={{ padding: '12px 0 0', textAlign: 'right', color: '#374151', fontSize: 13 }}>Total (taxes may apply)</td>
              <td style={{ padding: '12px 0 0', textAlign: 'right', fontSize: 16, fontWeight: 700, color: '#111827' }}>{formatCurrency(total_cents)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Mockup preview — uses pre-rendered CDN images, no query-string URLs */}
        {(mockup_front_url || mockup_back_url) && (
          <div style={{ margin: '24px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your mockup</p>
            <div style={{ display: 'inline-flex', gap: 16, justifyContent: 'center' }}>
              {mockup_front_url && (
                <div style={{ textAlign: 'center' }}>
                  <img src={mockup_front_url} alt="Front" width={180} style={{ display: 'block', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>Front</p>
                </div>
              )}
              {mockup_back_url && (
                <div style={{ textAlign: 'center' }}>
                  <img src={mockup_back_url} alt="Back" width={180} style={{ display: 'block', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>Back</p>
                </div>
              )}
            </div>
          </div>
        )}

        {valid_until && (
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>
            This quote is valid until <strong>{formatDate(valid_until)}</strong>.
          </p>
        )}

        {/* CTA */}
        <div style={{ textAlign: 'center', margin: '28px 0' }}>
          <a
            href={quote_url}
            style={{
              display: 'inline-block',
              backgroundColor: '#111827',
              color: '#ffffff',
              padding: '13px 32px',
              borderRadius: 6,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: '0.2px',
            }}
          >
            View &amp; Accept Quote
          </a>
        </div>

        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 0 }}>
          Questions? Simply reply to this email — we normally respond within one business day.
        </p>
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 32px', backgroundColor: '#f9fafb', borderTop: '1px solid #f3f4f6', borderRadius: '0 0 8px 8px' }}>
        <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
          Quote {quote_number} &nbsp;·&nbsp; Gho&amp;Co &nbsp;·&nbsp; {process.env.NEXT_PUBLIC_APP_URL ?? 'ghoandco.com'}
        </p>
      </div>
    </div>
  )
}
