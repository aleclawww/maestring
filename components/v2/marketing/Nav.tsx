/**
 * Marketing top nav.
 *
 * - Sticky, 64px height
 * - Transparent at the top of the page; once scrolled past 24px, switches to
 *   white/95 with a backdrop blur and a 1px bottom border. This is the
 *   Stripe/Linear convention — nav blends into the hero, then asserts itself
 *   when the user starts scrolling.
 * - Mobile: drawer triggered by hamburger; respects prefers-reduced-motion.
 */
'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, ArrowRight } from 'lucide-react'
import { Button, Logo } from '@/components/v2'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { label: 'Certifications', href: '/certifications' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'For teams', href: '/teams' },
  { label: 'Resources', href: '/blog' },
]

export function Nav() {
  const [scrolled, setScrolled] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll when mobile drawer open
  React.useEffect(() => {
    if (open) {
      const original = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = original
      }
    }
  }, [open])

  // Close on route change
  React.useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 w-full transition-all duration-200 ease-v2',
          scrolled
            ? 'border-b border-v2-border bg-v2-background/85 backdrop-blur-md'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-6 px-6">
          {/* Brand */}
          <div className="flex items-center gap-8">
            <Logo size={20} href="/" />
            {/* Desktop links */}
            <nav className="hidden items-center gap-1 lg:flex">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-md px-3 py-2 text-[14px] font-medium text-v2-foreground-muted transition-colors hover:bg-v2-surface-subtle hover:text-v2-foreground"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right cluster — desktop */}
          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/login"
              className="rounded-md px-3 py-2 text-[14px] font-medium text-v2-foreground-muted transition-colors hover:text-v2-foreground"
            >
              Sign in
            </Link>
            <Button size="md" className="rounded-full">
              Get started free
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Button>
          </div>

          {/* Mobile trigger */}
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-v2-border bg-v2-surface text-v2-foreground transition-colors hover:bg-v2-surface-subtle lg:hidden"
          >
            {open ? (
              <X className="h-5 w-5" strokeWidth={2} />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={2} />
            )}
          </button>
        </div>
      </header>

      {/* Mobile drawer — slides under the nav, not over it */}
      {open && (
        <div className="fixed inset-x-0 top-16 z-30 border-b border-v2-border bg-v2-background/95 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-1 px-6 py-6">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-4 py-3 text-[16px] font-medium text-v2-foreground transition-colors hover:bg-v2-surface-subtle"
              >
                {l.label}
              </Link>
            ))}
            <div className="my-3 h-px bg-v2-border" />
            <Link
              href="/login"
              className="rounded-lg px-4 py-3 text-[16px] font-medium text-v2-foreground-muted transition-colors hover:bg-v2-surface-subtle"
            >
              Sign in
            </Link>
            <Button size="lg" className="mt-2 w-full rounded-full">
              Get started free
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
