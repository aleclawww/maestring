import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/admin'
import { Logo } from '@/components/v2'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin — Maestring',
  robots: { index: false, follow: false },
}

const NAV = [
  { href: '/admin', label: 'Overview', icon: '📊' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/llm', label: 'LLM Usage', icon: '🧠' },
  { href: '/admin/economics', label: 'Unit Economics', icon: '💰' },
  { href: '/admin/documents', label: 'Documents', icon: '📄' },
  { href: '/admin/outcomes', label: 'Outcomes', icon: '🎯' },
  { href: '/admin/testimonials', label: 'Testimonials', icon: '💬' },
  { href: '/admin/questions', label: 'Question Pool', icon: '❓' },
  { href: '/admin/briefs', label: 'Concept Briefs', icon: '📘' },
  { href: '/admin/cron', label: 'Cron Runs', icon: '⏰' },
  { href: '/admin/actions', label: 'Audit Log', icon: '🗒️' },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAdmin()
  return (
    <div className="theme-v2 min-h-screen bg-v2-background text-v2-foreground">
      <div className="flex">
        <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-v2-border bg-v2-surface">
          <div className="border-b border-v2-border-subtle px-5 py-5">
            <Logo size={20} href="/admin" />
            <p className="mt-2 font-v2-mono text-[10px] uppercase tracking-v2-wide text-v2-foreground-subtle">
              Admin console
            </p>
          </div>
          <nav className="flex-1 space-y-0.5 px-2 py-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-v2-foreground-muted transition-colors hover:bg-v2-surface-subtle hover:text-v2-foreground"
              >
                <span className="text-base" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-v2-border-subtle px-4 py-3 text-[11px]">
            <p className="truncate text-v2-foreground-muted">{user.email}</p>
            <Link
              href="/dashboard"
              className="mt-1 inline-flex items-center gap-1 font-semibold text-v2-brand transition-colors hover:text-v2-brand-hover"
            >
              <ArrowLeft className="h-3 w-3" strokeWidth={2.25} />
              Back to app
            </Link>
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
