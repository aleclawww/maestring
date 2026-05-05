/**
 * Dashboard sidebar.
 *
 * - 240px fixed-width left rail on desktop
 * - Logo at the top, primary nav, current-cert mini-card at the bottom,
 *   then settings + avatar
 * - Active nav item gets the brand-soft fill + brand text — never a
 *   transform; this is a quiet, persistent surface
 * - Mobile: hidden by default, slides in from left when openMobile is true
 */
'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  BookOpen,
  FileCheck,
  TrendingUp,
  Users,
  Settings,
  ChevronRight,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Logo } from '@/components/v2'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  Icon: LucideIcon
}

const NAV: NavItem[] = [
  { label: 'Home', href: '/dashboard', Icon: Home },
  { label: 'Learn', href: '/learn', Icon: BookOpen },
  { label: 'Study', href: '/study', Icon: TrendingUp },
  { label: 'Mock exams', href: '/exam', Icon: FileCheck },
  { label: 'Progress', href: '/progress', Icon: TrendingUp },
  { label: 'Referrals', href: '/referrals', Icon: Users },
]

interface SidebarProps {
  openMobile?: boolean
  onCloseMobile?: () => void
  userName?: string | null
  userAvatar?: string | null
  plan?: 'free' | 'pro' | 'trial' | 'past_due' | string
}

function initialsFrom(name?: string | null) {
  if (!name) return 'M'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'M'
}

function planLabel(plan?: string) {
  if (!plan) return 'Free'
  if (plan === 'pro') return 'Pro · $29/mo'
  if (plan === 'trial' || plan === 'trialing') return 'Trial'
  if (plan === 'past_due') return 'Payment failed'
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}

export function Sidebar({
  openMobile = false,
  onCloseMobile,
  userName,
  userAvatar,
  plan,
}: SidebarProps) {
  const pathname = usePathname()

  const inner = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-6">
        <Logo size={20} href="/dashboard" />
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-v2-foreground-muted hover:bg-v2-surface-subtle hover:text-v2-foreground lg:hidden"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pt-2">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active =
              item.href === '/dashboard'
                ? pathname === item.href
                : pathname.startsWith(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors duration-150',
                    active
                      ? 'bg-v2-brand-soft text-v2-brand'
                      : 'text-v2-foreground-muted hover:bg-v2-surface-subtle hover:text-v2-foreground',
                  )}
                >
                  <item.Icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      active && 'text-v2-brand',
                    )}
                    strokeWidth={2}
                  />
                  <span className="flex-1">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Current cert card */}
      <div className="px-3 pb-3">
        <Link
          href="/learn"
          className="group block rounded-xl border border-v2-border bg-v2-surface p-3.5 shadow-v2-soft transition-all duration-200 ease-v2 hover:-translate-y-0.5 hover:shadow-v2-elevated"
        >
          <div className="flex items-center justify-between">
            <span className="rounded-md border border-v2-brand/20 bg-v2-brand-soft px-1.5 py-0.5 font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-brand">
              SAA-C03
            </span>
            <ChevronRight
              className="h-3.5 w-3.5 text-v2-foreground-subtle transition-transform duration-200 ease-v2 group-hover:translate-x-0.5 group-hover:text-v2-brand"
              strokeWidth={2.25}
            />
          </div>
          <p className="mt-2 text-[12px] font-semibold text-v2-foreground">
            Solutions Architect
          </p>

          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-v2-surface-sunken">
              <div
                className="h-full rounded-full bg-v2-gradient-brand"
                style={{ width: '68%' }}
              />
            </div>
            <span className="font-v2-mono text-[10px] font-semibold text-v2-foreground-muted">
              68%
            </span>
          </div>
          <p className="mt-2 font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
            Exam in 18 days
          </p>
        </Link>
      </div>

      {/* Bottom: settings + avatar */}
      <div className="border-t border-v2-border-subtle p-3">
        <Link
          href="/settings"
          className="group flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium text-v2-foreground-muted transition-colors hover:bg-v2-surface-subtle hover:text-v2-foreground"
        >
          <Settings className="h-4 w-4" strokeWidth={2} />
          <span>Settings</span>
        </Link>

        <div className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2">
          {userAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userAvatar}
              alt=""
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-v2-gradient-brand text-[12px] font-bold text-white shadow-v2-button">
              {initialsFrom(userName)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-v2-foreground">
              {userName ?? 'Maestring user'}
            </div>
            <div className="truncate text-[11px] text-v2-foreground-muted">
              {planLabel(plan)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar — always visible */}
      <aside className="hidden h-screen w-[240px] shrink-0 border-r border-v2-border bg-v2-surface lg:sticky lg:top-0 lg:flex lg:flex-col">
        {inner}
      </aside>

      {/* Mobile drawer */}
      {openMobile && (
        <>
          <div
            aria-hidden
            className="fixed inset-0 z-40 bg-v2-foreground/40 backdrop-blur-sm lg:hidden"
            onClick={onCloseMobile}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[280px] bg-v2-surface shadow-v2-modal lg:hidden">
            {inner}
          </aside>
        </>
      )}
    </>
  )
}
