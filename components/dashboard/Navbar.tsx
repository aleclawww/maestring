'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { NotificationsDropdown } from './NotificationsDropdown'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/learn/session': 'Coach',
  '/learn/calibration': 'Calibration',
  '/learn/exam-guide': 'SAA-C03 Exam Guide',
  '/learn/c': 'Concept',
  '/learn': 'Learn',
  '/study': 'Study Session',
  '/flashcards': 'Flashcards',
  '/exam': 'Exam Simulator',
  '/progress': 'My Progress',
  '/documents': 'Documents',
  '/settings': 'Settings',
  '/referrals': 'Referrals',
  '/onboarding': 'Initial Setup',
  '/trial-required': 'Start your trial',
}

interface NavbarProps {
  onMenuClick?: () => void
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const pathname = usePathname()

  const title =
    Object.entries(PAGE_TITLES).find(
      ([key]) => pathname === key || pathname.startsWith(key + '/')
    )?.[1] ?? 'Maestring'

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4 lg:px-6">
      {/* Left: mobile menu + title */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="rounded-lg p-2 text-text-muted hover:bg-surface-2 hover:text-text-primary transition-colors lg:hidden"
            aria-label="Open menu"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        )}
        <h1 className="text-sm font-semibold text-text-primary">{title}</h1>
      </div>

      {/* Right: quick actions */}
      <div className="flex items-center gap-2">
        {/* Quick study shortcut */}
        <Link
          href="/study"
          className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
        >
          <span>⚡</span>
          Study now
        </Link>

        {/* Live notifications bell */}
        <NotificationsDropdown />
      </div>
    </header>
  )
}
