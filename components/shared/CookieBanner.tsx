'use client'

// Rendered at the ROOT layout — outside the .theme-v2 wrapper. Uses
// hard-coded Tailwind palette values (slate / indigo) that match the v2
// design tokens, so it stays consistent without depending on the scoped
// CSS variables.

import { useEffect, useState } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'maestring_cookie_consent_v1'

type Consent = 'accepted' | 'rejected'

export function readCookieConsent(): Consent | null {
  if (typeof window === 'undefined') return null
  const v = window.localStorage.getItem(STORAGE_KEY)
  return v === 'accepted' || v === 'rejected' ? v : null
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (readCookieConsent() === null) setVisible(true)
  }, [])

  function decide(value: Consent) {
    window.localStorage.setItem(STORAGE_KEY, value)
    window.dispatchEvent(
      new CustomEvent('maestring:consent', { detail: value }),
    )
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.18)] sm:bottom-6 sm:left-6 sm:right-auto"
      style={{
        fontFamily:
          'var(--font-jakarta), "Plus Jakarta Sans", system-ui, sans-serif',
      }}
    >
      <p className="text-[13px] leading-[1.6] text-slate-700">
        We use necessary cookies to make the app work, and optional analytics
        (PostHog) to understand how the product is used and improve it.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => decide('accepted')}
          className="inline-flex h-9 items-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 px-3.5 text-[12px] font-semibold text-white shadow-[0_4px_14px_0_rgba(79,70,229,0.30)] transition-all hover:-translate-y-0.5"
        >
          Accept all
        </button>
        <button
          type="button"
          onClick={() => decide('rejected')}
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3.5 text-[12px] font-semibold text-slate-900 transition-colors hover:bg-slate-50"
        >
          Necessary only
        </button>
        <Link
          href="/legal/privacy"
          className="ml-auto text-[12px] font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          Learn more
        </Link>
      </div>
    </div>
  )
}
