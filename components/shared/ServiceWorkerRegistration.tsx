'use client'

import { useEffect } from 'react'

// Registers /sw.js once on first client render.
// Kept as a tiny isolated component so it can be dropped into RootLayout without
// polluting the server component tree. Silently no-ops on unsupported browsers.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // Check for updates whenever the user navigates (tab becomes visible).
        const handleVisibility = () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {})
        }
        document.addEventListener('visibilitychange', handleVisibility)
        return () => document.removeEventListener('visibilitychange', handleVisibility)
      })
      .catch(() => {
        // SW registration failure is non-fatal — app works normally without it.
      })
  }, [])

  return null
}
