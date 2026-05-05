/**
 * Dashboard shell — composes Sidebar + TopBar around children.
 *
 * Manages the mobile sidebar drawer state. Pages pass an optional
 * breadcrumb to the topbar; otherwise the topbar shows just "Home".
 */
'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

interface ShellProps {
  children: React.ReactNode
  breadcrumb?: Array<{ label: string; href?: string }>
  userName?: string | null
  userAvatar?: string | null
  plan?: string
  /** Banners (TrialBanner, PreviewBanner) rendered above the page content. */
  banners?: React.ReactNode
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Home',
  learn: 'Learn',
  study: 'Study',
  exam: 'Mock exam',
  flashcards: 'Flashcards',
  progress: 'Progress',
  settings: 'Settings',
  referrals: 'Referrals',
  documents: 'Documents',
  onboarding: 'Setup',
  c: 'Concept',
  results: 'Results',
}

function deriveBreadcrumb(pathname: string) {
  // /dashboard, /learn/c/iam-policies, /study, /exam/[id], etc.
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) return [{ label: 'Home' }]
  // /dashboard alone is the home
  if (parts[0] === 'dashboard' && parts.length === 1) {
    return [{ label: 'Home' }]
  }

  const crumbs: Array<{ label: string; href?: string }> = [
    { label: 'Home', href: '/dashboard' },
  ]
  let acc = ''
  parts.forEach((seg, idx) => {
    acc += `/${seg}`
    const isLast = idx === parts.length - 1
    const label = ROUTE_LABELS[seg] ?? seg.toUpperCase()
    crumbs.push(isLast ? { label } : { label, href: acc })
  })
  return crumbs
}

export function Shell({
  children,
  breadcrumb,
  userName,
  userAvatar,
  plan,
  banners,
}: ShellProps) {
  const [openMobile, setOpenMobile] = React.useState(false)
  const pathname = usePathname() ?? ''
  const resolved = breadcrumb ?? deriveBreadcrumb(pathname)

  return (
    <div className="flex min-h-screen bg-v2-background">
      <Sidebar
        openMobile={openMobile}
        onCloseMobile={() => setOpenMobile(false)}
        userName={userName}
        userAvatar={userAvatar}
        plan={plan}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          breadcrumb={resolved}
          onOpenMobileSidebar={() => setOpenMobile(true)}
        />

        {banners && <div className="border-b border-v2-border bg-v2-surface">{banners}</div>}

        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 sm:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
