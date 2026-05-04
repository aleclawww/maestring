import { cn } from '@/lib/utils'

export function Stat({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string | number
  hint?: string
  tone?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const toneClass =
    tone === 'success'
      ? 'text-v2-success'
      : tone === 'warning'
      ? 'text-v2-warning'
      : tone === 'danger'
      ? 'text-v2-error'
      : 'text-v2-foreground'
  return (
    <div className="rounded-xl border border-v2-border bg-v2-surface px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-v2-foreground-subtle">{label}</p>
      <p className={cn('text-2xl font-bold mt-1', toneClass)}>{value}</p>
      {hint && <p className="text-xs text-v2-foreground-subtle mt-0.5">{hint}</p>}
    </div>
  )
}

export function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-v2-border bg-v2-surface overflow-hidden">
      <header className="flex items-center justify-between border-b border-v2-border px-5 py-3">
        <h2 className="text-sm font-semibold text-v2-foreground">{title}</h2>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

export function Table<T>({
  rows,
  columns,
  empty = 'No data',
}: {
  rows: T[]
  columns: Array<{ key: string; label: string; render: (row: T) => React.ReactNode; className?: string }>
  empty?: string
}) {
  if (!rows.length) {
    return <p className="text-sm text-v2-foreground-subtle italic">{empty}</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-v2-border text-left">
            {columns.map(c => (
              <th key={c.key} className="px-2 py-2 text-[11px] uppercase tracking-wider text-v2-foreground-subtle font-normal">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-v2-border/60 hover:bg-v2-surface-subtle/40 transition-colors">
              {columns.map(c => (
                <td key={c.key} className={cn('px-2 py-2', c.className)}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function formatUsd(amount: number | null | undefined, maxFrac = 2): string {
  const n = Number(amount ?? 0)
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: maxFrac })}`
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', {
    year: '2-digit', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function PlanPill({ plan }: { plan: string }) {
  const map: Record<string, string> = {
    free: 'bg-v2-surface-subtle text-v2-foreground-subtle',
    pro: 'bg-v2-brand/15 text-v2-brand',
    pro_annual: 'bg-v2-success/15 text-v2-success',
    enterprise: 'bg-v2-warning/15 text-v2-warning',
  }
  const klass = map[plan] ?? map['free']
  return <span className={cn('inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase', klass)}>{plan}</span>
}
