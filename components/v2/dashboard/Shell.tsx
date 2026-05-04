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
  courses: 'My courses',
  exams: 'Mock exams',
  progress: 'Progress',
  community: 'Community',
  settings: 'Settings',
  lesson: 'Lesson',
}

function deriveBreadcrumb(pathname: string) {
  // /preview/dashboard or /preview/dashboard/courses/saa-c03/lesson/03
  const parts = pathname.replace(/^\/preview\//, '').split('/').filter(Boolean)
  if (parts.length === 0) return [{ label: 'Home' }]
  // Strip leading "dashboard"
  const rest = parts[0] === 'dashboard' ? parts.slice(1) : parts
  if (rest.length === 0) return [{ label: 'Home' }]

  const crumbs: Array<{ label: string; href?: string }> = [
    { label: 'Home', href: '/preview/dashboard' },
  ]
  let acc = '/preview/dashboard'
  rest.forEach((seg, idx) => {
    acc += `/${seg}`
    const isLast = idx === rest.length - 1
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
