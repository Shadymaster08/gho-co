import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Gho&Co — Custom Shirts, 3D Prints & More'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1d1d1f 0%, #2a2a2e 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          padding: '60px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 88, fontWeight: 800, color: '#ffffff', letterSpacing: '-3px', lineHeight: 1 }}>
            Gho&amp;Co
          </div>
          <div
            style={{
              fontSize: 28,
              color: '#86868b',
              marginTop: 20,
              textAlign: 'center',
              letterSpacing: '0.5px',
            }}
          >
            Custom Shirts · 3D Prints · DIY · Lighting
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 48,
              gap: '16px',
            }}
          >
            {['DTF Transfers', '3D Printing', 'Custom Lighting', 'DIY Projects'].map(tag => (
              <div
                key={tag}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '999px',
                  padding: '8px 20px',
                  fontSize: 18,
                  color: '#d1d1d6',
                }}
              >
                {tag}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 22, color: '#0071e3', marginTop: 48, fontWeight: 600, letterSpacing: '0.5px' }}>
            ghoandco.com
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
