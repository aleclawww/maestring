'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import type { SubscriptionPlan } from '@/types/database'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/learn', label: 'Learn', icon: '📚' },
  { href: '/learn/session', label: 'Coach', icon: '🧭' },
  { href: '/study', label: 'Study', icon: '📖' },
  { href: '/flashcards', label: 'Flashcards', icon: '🃏' },
  { href: '/exam', label: 'Exam', icon: '📝' },
  { href: '/progress', label: 'Progress', icon: '📊' },
  { href: '/documents', label: 'Documents', icon: '📄' },
  { href: '/referrals', label: 'Referrals', icon: '👥' },
  { href: '/settings?tab=subscription', label: 'Billing', icon: '💳' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

interface SidebarProps {
  userName?: string | null
  userAvatar?: string | null
  plan?: SubscriptionPlan
}

export function Sidebar({ userName, userAvatar, plan = 'free' }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)

  async function handleSignOut() {
    // Previously `await supabase.auth.signOut()` was a bare await with no
    // error check. If the signOut call silently failed (network blip, cookie
    // adapter error, Supabase SDK rejection) we STILL pushed to /login — the
    // user saw the login screen but the session cookie was intact, so the
    // middleware redirect and/or the back button put them right back into
    // the dashboard. Classic "I clicked log out and I'm still logged in"
    // security/UX bug. Log the error to DevTools and skip the redirect so
    // the user can see they're still signed in and retry (or refresh).
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Sidebar signOut failed — session cookie may still be active', error)
      return
    }
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-border bg-surface transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center border-b border-border p-4', collapsed ? 'justify-center' : 'gap-3')}>
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/20">
          <span className="text-lg">🎓</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-text-primary">Maestring</p>
            <p className="text-xs text-text-muted">AWS SAA-C03</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto rounded-lg p-1 text-text-muted hover:bg-surface-2 hover:text-text-primary transition-colors"
          aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
        >
          <svg
            className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* Navigation — longest-prefix-match wins so /learn/session highlights
          only Coach, not both Coach AND Learn. */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {(() => {
          const matchPaths = navItems.map(it => (it.href.split('?')[0] ?? it.href))
          const matchIdx = matchPaths
            .map((p, i) => ({
              i,
              len: pathname === p || (p !== '/dashboard' && pathname.startsWith(p + '/')) ? p.length : -1,
            }))
            .reduce((best, cur) => (cur.len > best.len ? cur : best), { i: -1, len: -1 }).i
          return navItems.map((item, idx) => {
            const isActive = idx === matchIdx
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  collapsed ? 'justify-center' : 'gap-3',
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
                )}
              >
                <span className="text-base">{item.icon}</span>
                {!collapsed && item.label}
              </Link>
            )
          })
        })()}
      </nav>

      {/* User section */}
      <div className={cn('border-t border-border p-3', collapsed ? 'space-y-2' : 'space-y-3')}>
        {/* Plan badge */}
        {!collapsed && plan !== 'free' && (
          <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
            <p className="text-xs font-semibold text-primary">
              ✨ {plan === 'pro_annual' ? 'Pro Annual' : plan === 'enterprise' ? 'Enterprise' : 'Pro'} Plan
            </p>
          </div>
        )}

        {/* User info */}
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
            {userAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userAvatar}
                alt={userName ?? 'User'}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              (userName?.[0] ?? 'U').toUpperCase()
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text-primary truncate">
                {userName ?? 'User'}
              </p>
              <p className="text-xs text-text-muted capitalize">{plan}</p>
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sign out' : undefined}
          className={cn(
            'flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-surface-2 hover:text-danger transition-colors',
            collapsed ? 'justify-center' : 'gap-3'
          )}
        >
          <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </aside>
  )
}
