import Link from 'next/link'
import { listAdminUsers } from '@/lib/admin/rpc'
import { Section, Table, formatUsd, formatDate, formatDateTime, PlanPill } from '@/components/admin/Stat'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50
const PLANS = ['', 'free', 'pro', 'pro_annual', 'enterprise']

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>
}) {
  const search = searchParams['q']?.trim() || undefined
  const plan = searchParams['plan']?.trim() || undefined
  const page = Math.max(0, Number(searchParams['page'] ?? 0))
  const rows = await listAdminUsers({
    search,
    plan,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  return (
    <div className="p-6 space-y-4 max-w-[1400px]">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Users</h1>
          <p className="text-xs text-text-muted">Buscar por email o nombre. Filtrar por plan.</p>
        </div>
      </header>

      <form className="flex gap-2 items-center" action="/admin/users">
        <input
          name="q"
          defaultValue={search ?? ''}
          placeholder="email o nombre…"
          className="flex-1 max-w-sm bg-surface border border-border rounded-lg px-3 py-1.5 text-sm"
        />
        <select
          name="plan"
          defaultValue={plan ?? ''}
          className="bg-surface border border-border rounded-lg px-2 py-1.5 text-sm"
        >
          {PLANS.map(p => (
            <option key={p} value={p}>{p || 'all plans'}</option>
          ))}
        </select>
        <button type="submit" className="btn-primary text-sm px-3 py-1.5">Filtrar</button>
      </form>

      <Section title={`Results · ${rows.length}${rows.length === PAGE_SIZE ? '+' : ''}`}>
        <Table
          rows={rows}
          empty="Sin resultados"
          columns={[
            {
              key: 'email',
              label: 'User',
              render: r => (
                <Link href={`/admin/users/${r.id}`} className="hover:text-primary">
                  <div className="font-medium">{r.email}</div>
                  <div className="text-[11px] text-text-muted">{r.full_name ?? '—'}</div>
                </Link>
              ),
            },
            { key: 'plan', label: 'Plan', render: r => <PlanPill plan={r.plan} /> },
            {
              key: 'phase',
              label: 'Phase',
              render: r => <span className="text-[11px] text-text-muted">{r.journey_phase}</span>,
            },
            {
              key: 'readiness',
              label: 'Ready',
              render: r => (r.last_readiness_score != null ? (
                <span className="font-mono text-xs">{Number(r.last_readiness_score).toFixed(0)}</span>
              ) : <span className="text-text-muted">—</span>),
            },
            {
              key: 'streak',
              label: 'Streak',
              render: r => <span className="text-xs">{r.current_streak}d</span>,
            },
            {
              key: 'exam',
              label: 'Exam',
              render: r => (
                <div className="text-[11px]">
                  <div>{formatDate(r.exam_target_date)}</div>
                  {r.exam_outcome && r.exam_outcome !== 'unknown' && (
                    <div className={r.exam_outcome === 'passed' ? 'text-success' : 'text-danger'}>
                      {r.exam_outcome}
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'spend',
              label: 'LLM 30d',
              render: r => (
                <span className={Number(r.llm_spend_30d) > 3 ? 'text-warning font-mono text-xs' : 'font-mono text-xs'}>
                  {formatUsd(Number(r.llm_spend_30d))}
                </span>
              ),
            },
            {
              key: 'last',
              label: 'Last session',
              render: r => <span className="text-[11px] text-text-muted">{formatDateTime(r.last_session_at)}</span>,
            },
            {
              key: 'created',
              label: 'Joined',
              render: r => <span className="text-[11px] text-text-muted">{formatDate(r.created_at)}</span>,
            },
          ]}
        />
      </Section>

      <nav className="flex items-center gap-2 text-xs">
        {page > 0 && (
          <Link
            href={`/admin/users?${new URLSearchParams({ ...(search ? { q: search } : {}), ...(plan ? { plan } : {}), page: String(page - 1) })}`}
            className="text-primary hover:underline"
          >← Prev</Link>
        )}
        <span className="text-text-muted">Page {page + 1}</span>
        {rows.length === PAGE_SIZE && (
          <Link
            href={`/admin/users?${new URLSearchParams({ ...(search ? { q: search } : {}), ...(plan ? { plan } : {}), page: String(page + 1) })}`}
            className="text-primary hover:underline"
          >Next →</Link>
        )}
      </nav>
    </div>
  )
}
