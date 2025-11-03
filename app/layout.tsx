export const metadata = {
  title: 'Provenance Registry DApp',
  description: 'Submit provenance JSON to on-chain registry',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          .container { max-width: 1000px; margin: 24px auto; padding: 0 16px; }
          @media (max-width: 640px) { .container { margin: 16px auto; padding: 0 12px; } }

          .hero-title { font-size: 28px; font-weight: 800; }
          @media (max-width: 640px) { .hero-title { font-size: 22px; } }

          .btn-row { display: flex; gap: 12px; flex-wrap: wrap; }

          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          @media (max-width: 640px) { .grid-2 { grid-template-columns: 1fr; } }

          /* Key-value display rows on tx page */
          .kv-row { display: flex; justify-content: space-between; align-items: flex-start; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; min-height: 44px; }
          .kv-key { color: #64748b; font-size: 13px; font-weight: 600; min-width: 120px; padding-right: 12px; display: flex; align-items: center; }
          .kv-val { word-break: break-word; text-align: right; flex: 1; color: #0f172a; font-size: 14px; line-height: 1.4; }
          @media (max-width: 640px) { .kv-row { flex-direction: column; } .kv-key { min-width: auto; margin-bottom: 6px; } .kv-val { text-align: left; } }

          /* KeyValueEditor rows */
          .kv-row-grid { display: grid; grid-template-columns: 1fr 1.5fr auto; gap: 8px; align-items: center; }
          @media (max-width: 640px) { .kv-row-grid { grid-template-columns: 1fr; } .kv-row-grid button { width: 100%; } }
        `}</style>
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif' }}>
        <header style={{
          background: '#111827',
          color: '#fff',
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
        }}>
          <div style={{ fontWeight: 700 }}>Provenance Registry</div>
          <nav style={{ display: 'flex', gap: 16 }}>
            <a href="/" style={{ color: '#fff', textDecoration: 'none' }}>Home</a>
            <a href="https://github.com" target="_blank" style={{ color: '#9ca3af', textDecoration: 'none' }}>Docs</a>
          </nav>
        </header>

        <div>
          {children}
        </div>

        <footer style={{
          borderTop: '1px solid #e5e7eb',
          marginTop: 24,
          padding: '16px 20px',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          <div>Demo UI — For production use a secure KMS or hardware signer.</div>
        </footer>
      </body>
    </html>
  )
}
