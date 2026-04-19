'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect, useState } from 'react'
import { readCookieConsent } from './CookieBanner'

let initialized = false

function initPostHog() {
  if (initialized) return
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
    capture_pageview: false,
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') ph.debug()
    },
  })
  initialized = true
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [consented, setConsented] = useState(false)

  useEffect(() => {
    if (readCookieConsent() === 'accepted') {
      initPostHog()
      setConsented(true)
    }
    function onConsent(e: Event) {
      const detail = (e as CustomEvent<'accepted' | 'rejected'>).detail
      if (detail === 'accepted') {
        initPostHog()
        setConsented(true)
      } else if (detail === 'rejected' && initialized) {
        posthog.opt_out_capturing()
        setConsented(false)
      }
    }
    window.addEventListener('maestring:consent', onConsent)
    return () => window.removeEventListener('maestring:consent', onConsent)
  }, [])

  if (!consented) return <>{children}</>
  return <PHProvider client={posthog}>{children}</PHProvider>
}
