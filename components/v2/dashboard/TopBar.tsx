/**
 * Dashboard top bar.
 *
 * 56px tall. Breadcrumb left, command-palette search center, action cluster
 * right (streak counter, notifications, mobile-only sidebar trigger).
 *
 * The search shows ⌘K hint on macOS, Ctrl K elsewhere — detected at mount.
 */
'use client'

import * as React from 'react'
import { Bell, Flame, Menu, Search } from 'lucide-react'

interface TopBarProps {
  breadcrumb?: Array<{ label: string; href?: string }>
  onOpenMobileSidebar?: () => void
}

export function TopBar({
  breadcrumb = [{ label: 'Home' }],
  onOpenMobileSidebar,
}: TopBarProps) {
  const [shortcut, setShortcut] = React.useState('Ctrl K')

  React.useEffect(() => {
    if (typeof navigator !== 'undefined' && /Mac/.test(navigator.platform)) {
      setShortcut('⌘ K')
    }
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-v2-border bg-v2-background/85 px-4 backdrop-blur-md sm:gap-4 sm:px-6">
      {/* Mobile menu */}
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onOpenMobileSidebar}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-v2-foreground-muted transition-colors hover:bg-v2-surface-subtle hover:text-v2-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" strokeWidth={2} />
      </button>

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-1.5 truncate"
      >
        {breadcrumb.map((b, i) => {
          const last = i === breadcrumb.length - 1
          return (
            <React.Fragment key={`${b.label}-${i}`}>
              {b.href && !last ? (
                <a
                  href={b.href}
                  className="text-[13px] font-medium text-v2-foreground-muted transition-colors hover:text-v2-foreground"
                >
                  {b.label}
                </a>
              ) : (
                <span
                  className={
                    last
                      ? 'truncate text-[13px] font-semibold text-v2-foreground'
                      : 'text-[13px] font-medium text-v2-foreground-muted'
                  }
                >
                  {b.label}
                </span>
              )}
              {!last && (
                <span
                  aria-hidden
                  className="text-[12px] text-v2-foreground-subtle"
                >
                  /
                </span>
              )}
            </React.Fragment>
          )
        })}
      </nav>

      {/* Search */}
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          className="hidden h-9 w-[280px] items-center gap-2 rounded-lg border border-v2-border bg-v2-surface px-3 text-left text-[13px] text-v2-foreground-subtle transition-colors hover:border-v2-border-strong hover:text-v2-foreground-muted md:flex lg:w-[320px]"
        >
          <Search className="h-3.5 w-3.5" strokeWidth={2} />
          <span className="flex-1">Search lessons, services, exams…</span>
          <kbd className="rounded border border-v2-border bg-v2-surface-subtle px-1.5 py-0.5 font-v2-mono text-[10px] font-semibold text-v2-foreground-muted">
            {shortcut}
          </kbd>
        </button>

        {/* Compact search button on small screens */}
        <button
          type="button"
          aria-label="Search"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-v2-foreground-muted transition-colors hover:bg-v2-surface-subtle hover:text-v2-foreground md:hidden"
        >
          <Search className="h-4 w-4" strokeWidth={2} />
        </button>

        {/* Streak */}
        <div className="hidden items-center gap-2 rounded-full border border-v2-border bg-v2-surface px-2.5 py-1 sm:flex">
          <Flame
            className="h-3.5 w-3.5 text-v2-warning"
            strokeWidth={2.25}
            fill="currentColor"
            fillOpacity={0.2}
          />
          <span className="font-v2-mono text-[12px] font-semibold text-v2-foreground">
            12 days
          </span>
        </div>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-v2-foreground-muted transition-colors hover:bg-v2-surface-subtle hover:text-v2-foreground"
        >
          <Bell className="h-4 w-4" strokeWidth={2} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-v2-brand" />
        </button>
      </div>
    </header>
  )
}
