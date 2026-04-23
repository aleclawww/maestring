'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="es">
      <body style={{ margin: 0, background: '#0b0b0f', color: '#e6e6ea', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <h1 style={{ fontSize: 22, marginBottom: 8 }}>Algo se rompió a un nivel muy bajo</h1>
            <p style={{ opacity: 0.7, marginBottom: 20, fontSize: 14 }}>
              Ya nos ha llegado el aviso. Puedes intentar recargar.
            </p>
            <button
              onClick={() => reset()}
              style={{
                background: '#6366f1',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
