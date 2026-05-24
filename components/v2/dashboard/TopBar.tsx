/**
 * Dashboard top bar.
 *
 * 56px tall. Mobile menu trigger + breadcrumb left, nothing right.
 *
 * Three action-cluster items were removed 2026-05-24 because each was
 * UI lying about a capability that doesn't exist:
 *
 *   - Command-palette search button (with ⌘K hint): no handler, no
 *     palette implementation. A "Ctrl K" affordance that opens
 *     nothing breaks the user's trust the first time they try it.
 *   - Notifications bell + hardcoded red unread dot: no notification
 *     system in the codebase. The dot was the most insidious — it
 *     simulated "you have messages", invited the click, did nothing.
 *   - Streak pill ("12 days"): hardcoded same number for every user,
 *     not reading from profiles.current_streak.
 *
 * Real implementations are days of work each and are post-launch
 * candidates IF real users ask for them. Until then, less chrome
 * where everything visible WORKS beats more chrome where buttons lie.
 * Same dashboard-version of the discipline that cut Lifetime and labs.
 */
'use client'

import * as React from 'react'
import { Menu } from 'lucide-react'

interface TopBarProps {
  breadcrumb?: Array<{ label: string; href?: string }>
  onOpenMobileSidebar?: () => void
}

export function TopBar({
  breadcrumb = [{ label: 'Home' }],
  onOpenMobileSidebar,
}: TopBarProps) {
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
    </header>
  )
}
