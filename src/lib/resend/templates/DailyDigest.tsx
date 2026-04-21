import {
  Html, Head, Body, Container, Section, Text, Hr, Link, Preview,
} from '@react-email/components'

function cents(n: number) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n / 100)
}

interface DigestData {
  date: string
  pipeline: Record<string, number>
  new_today: number
  invoiced_cents: number
  collected_cents: number
  outstanding_cents: number
  stale_quotes: { quote_number: string; customer: string; hours: number; total_cents: number }[]
  stuck_orders: { order_number: string; customer: string; status: string; days: number }[]
  overdue_invoices: { invoice_number: string; customer: string; due_date: string; days_overdue: number; total_cents: number }[]
  draft_quotes: number
  total_flags: number
}

const PIPELINE_LABELS: Record<string, string> = {
  received: 'New / Received',
  in_review: 'In Review',
  quoted: 'Quoted (awaiting customer)',
  approved: 'Approved (ready for production)',
  in_production: 'In Production',
  shipped: 'Shipped',
}

const base: React.CSSProperties = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#1d1d1f' }
const label: React.CSSProperties = { fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#86868b', margin: '0 0 4px' }
const sectionTitle: React.CSSProperties = { fontSize: '13px', fontWeight: 700, color: '#1d1d1f', margin: '20px 0 8px' }
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0', fontSize: '13px' }
const flagItem: React.CSSProperties = { background: '#fff8ed', border: '1px solid #f5d28a', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', fontSize: '13px' }

export function DailyDigest({ digest, appUrl }: { digest: DigestData; appUrl: string }) {
  const hasFlags = digest.total_flags > 0

  return (
    <Html>
      <Head />
      <Preview>
        {hasFlags
          ? `⚠️ ${digest.total_flags} item${digest.total_flags > 1 ? 's' : ''} need attention — Gho&Co Daily Digest`
          : `✅ All clear — Gho&Co Daily Digest`}
      </Preview>
      <Body style={{ background: '#f5f5f7', padding: '32px 0' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', background: '#fff', borderRadius: '16px', overflow: 'hidden' }}>

          {/* Header */}
          <Section style={{ background: '#1d1d1f', padding: '24px 32px' }}>
            <Text style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>Gho&amp;Co</Text>
            <Text style={{ color: '#86868b', fontSize: '13px', margin: '4px 0 0' }}>Daily Digest — {digest.date}</Text>
          </Section>

          <Section style={{ padding: '24px 32px' }}>

            {/* Today summary */}
            <Text style={label}>Today</Text>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
              <div style={{ flex: 1, background: '#f5f5f7', borderRadius: '10px', padding: '12px 16px' }}>
                <Text style={{ ...label, margin: 0 }}>New orders</Text>
                <Text style={{ fontSize: '28px', fontWeight: 700, color: '#0071e3', margin: '4px 0 0' }}>{digest.new_today}</Text>
              </div>
              <div style={{ flex: 1, background: '#f5f5f7', borderRadius: '10px', padding: '12px 16px' }}>
                <Text style={{ ...label, margin: 0 }}>Action items</Text>
                <Text style={{ fontSize: '28px', fontWeight: 700, color: hasFlags ? '#d63b2f' : '#34c759', margin: '4px 0 0' }}>
                  {digest.total_flags}
                </Text>
              </div>
              <div style={{ flex: 1, background: '#f5f5f7', borderRadius: '10px', padding: '12px 16px' }}>
                <Text style={{ ...label, margin: 0 }}>Draft quotes</Text>
                <Text style={{ fontSize: '28px', fontWeight: 700, color: digest.draft_quotes > 0 ? '#ff9500' : '#1d1d1f', margin: '4px 0 0' }}>
                  {digest.draft_quotes}
                </Text>
              </div>
            </div>

            <Hr style={{ borderColor: '#f0f0f0', margin: '0 0 20px' }} />

            {/* Revenue */}
            <Text style={sectionTitle}>Revenue this month</Text>
            <div style={row}>
              <span style={{ color: '#86868b' }}>Invoiced</span>
              <span style={{ fontWeight: 600 }}>{cents(digest.invoiced_cents)}</span>
            </div>
            <div style={row}>
              <span style={{ color: '#86868b' }}>Collected</span>
              <span style={{ fontWeight: 600, color: '#34c759' }}>{cents(digest.collected_cents)}</span>
            </div>
            <div style={{ ...row, borderBottom: 'none' }}>
              <span style={{ color: '#86868b' }}>Outstanding</span>
              <span style={{ fontWeight: 600, color: digest.outstanding_cents > 0 ? '#ff9500' : '#34c759' }}>
                {cents(digest.outstanding_cents)}
              </span>
            </div>

            <Hr style={{ borderColor: '#f0f0f0', margin: '20px 0' }} />

            {/* Order pipeline */}
            <Text style={sectionTitle}>Order pipeline</Text>
            {Object.entries(digest.pipeline).map(([status, count]) => (
              count > 0 ? (
                <div key={status} style={row}>
                  <span style={{ color: '#86868b' }}>{PIPELINE_LABELS[status] ?? status}</span>
                  <span style={{ fontWeight: 600 }}>{count}</span>
                </div>
              ) : null
            ))}
            {Object.values(digest.pipeline).every(v => v === 0) && (
              <Text style={{ fontSize: '13px', color: '#86868b' }}>No active orders.</Text>
            )}

            {/* Action items */}
            {hasFlags && (
              <>
                <Hr style={{ borderColor: '#f0f0f0', margin: '20px 0' }} />
                <Text style={sectionTitle}>⚠️ Needs attention</Text>

                {digest.stuck_orders.map(o => (
                  <div key={o.order_number} style={flagItem}>
                    <Text style={{ margin: 0, fontWeight: 600 }}>
                      Order {o.order_number} stuck in "{o.status.replace('_', ' ')}" for {o.days} day{o.days !== 1 ? 's' : ''}
                    </Text>
                    <Text style={{ margin: '2px 0 0', color: '#86868b' }}>{o.customer}</Text>
                  </div>
                ))}

                {digest.stale_quotes.map(q => (
                  <div key={q.quote_number} style={flagItem}>
                    <Text style={{ margin: 0, fontWeight: 600 }}>
                      {q.quote_number} awaiting response for {q.hours}h — {cents(q.total_cents)}
                    </Text>
                    <Text style={{ margin: '2px 0 0', color: '#86868b' }}>{q.customer}</Text>
                  </div>
                ))}

                {digest.overdue_invoices.map(i => (
                  <div key={i.invoice_number} style={{ ...flagItem, background: '#fff2f2', borderColor: '#f5a8a8' }}>
                    <Text style={{ margin: 0, fontWeight: 600 }}>
                      {i.invoice_number} overdue by {i.days_overdue} day{i.days_overdue !== 1 ? 's' : ''} — {cents(i.total_cents)}
                    </Text>
                    <Text style={{ margin: '2px 0 0', color: '#86868b' }}>{i.customer} · due {i.due_date}</Text>
                  </div>
                ))}
              </>
            )}

            {!hasFlags && (
              <>
                <Hr style={{ borderColor: '#f0f0f0', margin: '20px 0' }} />
                <Text style={{ fontSize: '14px', color: '#34c759', fontWeight: 600, textAlign: 'center' }}>
                  ✅ All caught up — no action items today.
                </Text>
              </>
            )}

            <Hr style={{ borderColor: '#f0f0f0', margin: '24px 0 16px' }} />

            <Link href={`${appUrl}/admin`} style={{ display: 'block', textAlign: 'center', background: '#0071e3', color: '#fff', borderRadius: '980px', padding: '12px 24px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
              Open Admin Dashboard
            </Link>

          </Section>

          <Section style={{ padding: '12px 32px 24px', textAlign: 'center' }}>
            <Text style={{ fontSize: '11px', color: '#86868b', margin: 0 }}>
              Gho&amp;Co · This digest is sent to the store admin only.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}
