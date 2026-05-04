/**
 * Auth layout — minimal chrome, no marketing nav, no footer.
 *
 * The auth screen is single-task: get the user into (or out of) the
 * product. Surrounding it with marketing nav adds friction. Per the
 * design directive §7, the screen is a centered card on the subtle
 * surface with the logo at the top.
 */
import Link from 'next/link'
import { Logo } from '@/components/v2'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-v2-surface-subtle">
      {/* Atmospheric brand orbs in the corners — tie the auth screen
          back to the marketing brand without competing with the form. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl"
        style={{ background: 'var(--v2-gradient-brand)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 bottom-0 h-[480px] w-[480px] rounded-full opacity-50 blur-3xl"
        style={{ background: 'var(--v2-gradient-brand-soft)' }}
      />

      {/* Top bar — just the logo + a tiny exit link */}
      <header className="relative z-10 mx-auto flex max-w-[1200px] items-center justify-between px-6 py-6">
        <Logo size={22} href="/preview/landing" />
        <Link
          href="/preview/landing"
          className="text-[13px] font-medium text-v2-foreground-muted transition-colors hover:text-v2-foreground"
        >
          ← Back to site
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-start justify-center px-6 pb-16 pt-8 sm:pt-16">
        {children}
      </main>
    </div>
  )
}
