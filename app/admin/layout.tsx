import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/admin'
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
  { href: '/admin/actions', label: 'Audit Log', icon: '🗒️' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin()
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div className="flex">
        <aside className="sticky top-0 h-screen w-56 shrink-0 border-r border-border bg-surface flex flex-col">
          <div className="px-5 py-5 border-b border-border">
            <Link href="/admin" className="block">
              <p className="text-[11px] uppercase tracking-wider text-text-muted">Maestring</p>
              <p className="text-base font-bold">Admin Console</p>
            </Link>
          </div>
          <nav className="flex-1 px-2 py-3 space-y-0.5">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-colors"
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-border px-4 py-3 text-xs text-text-muted">
            <p className="truncate">{user.email}</p>
            <Link href="/dashboard" className="text-primary hover:underline">
              ← Back to app
            </Link>
          </div>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
