import Link from 'next/link'
import { getAdminUnitEconomics } from '@/lib/admin/rpc'
import { Section, Stat, Table, formatUsd, PlanPill } from '@/components/admin/Stat'

export const dynamic = 'force-dynamic'

function formatPct(n: number | null | undefined, digits = 1): string {
  if (n == null) return '—'
  return `${(Number(n) * 100).toFixed(digits)}%`
}

function marginTone(m: number | null): 'success' | 'warning' | 'danger' | 'default' {
  if (m == null) return 'default'
  if (m < 0) return 'danger'
  if (m < 0.5) return 'warning'
  return 'success'
}

export default async function AdminEconomicsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>
}) {
  const days = Math.max(7, Math.min(90, Number(searchParams['days'] ?? 30)))
  const data = await getAdminUnitEconomics(days)
  const o = data.overview

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Unit Economics</h1>
          <p className="text-xs text-text-muted">
            {days}d · {o.paying_users} paying · {o.active_users_window} active · single source of truth para decisiones de pricing y capping.
          </p>
        </div>
        <div className="flex gap-1 text-xs">
          {[7, 14, 30, 90].map(n => (
            <Link
              key={n}
              href={`/admin/economics?days=${n}`}
              className={`px-2 py-1 rounded ${n === days ? 'bg-primary/15 text-primary' : 'text-text-muted hover:bg-surface-2'}`}
            >
              {n}d
            </Link>
          ))}
        </div>
      </header>

      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((a, i) => (
            <div
              key={i}
              className={`rounded-lg border px-3 py-2 text-xs ${
                a.severity === 'danger'
                  ? 'border-danger/40 bg-danger/5 text-danger'
                  : 'border-warning/40 bg-warning/5 text-warning'
              }`}
            >
              <span className="font-mono text-[10px] uppercase tracking-wider opacity-70 mr-2">{a.code}</span>
              {a.message}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="MRR" value={formatUsd(o.mrr_usd)} />
        <Stat
          label="Gross margin"
          value={formatPct(o.gross_margin)}
          tone={marginTone(o.gross_margin)}
        />
        <Stat
          label="Cost / active user"
          value={formatUsd(o.cost_per_active_user_usd, 4)}
          tone={o.cost_per_active_user_usd > 2 ? 'danger' : o.cost_per_active_user_usd > 1 ? 'warning' : 'default'}
          hint={`${days}d window`}
        />
        <Stat label="LTV (estimate)" value={formatUsd(o.ltv_estimate_usd)} hint="ARPU × 12 (proxy)" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Revenue (window)" value={formatUsd(o.revenue_window_usd)} />
        <Stat
          label="LLM cost (window)"
          value={formatUsd(o.llm_cost_window_usd, 4)}
          tone={o.gross_margin != null && o.gross_margin < 0 ? 'danger' : 'default'}
        />
        <Stat
          label="Net (window)"
          value={formatUsd(o.revenue_window_usd - o.llm_cost_window_usd)}
          tone={o.revenue_window_usd - o.llm_cost_window_usd < 0 ? 'danger' : 'success'}
        />
      </div>

      <Section title="By plan">
        <Table
          rows={data.by_plan}
          empty="No data by plan yet."
          columns={[
            { key: 'plan', label: 'Plan', render: r => <PlanPill plan={r.plan} /> },
            { key: 'subs', label: 'Subs', render: r => r.subscribers },
            { key: 'active', label: 'Active (window)', render: r => r.active_users },
            { key: 'arpu', label: 'ARPU / mo', render: r => formatUsd(r.arpu_usd) },
            { key: 'mrr', label: 'MRR', render: r => formatUsd(r.mrr_usd) },
            { key: 'llm', label: 'LLM cost', render: r => formatUsd(r.llm_cost_usd, 4) },
            {
              key: 'cpu',
              label: 'Cost / user',
              render: r => (
                <span className={r.cost_per_active_user_usd > 2 ? 'text-danger' : r.cost_per_active_user_usd > 1 ? 'text-warning' : ''}>
                  {formatUsd(r.cost_per_active_user_usd, 4)}
                </span>
              ),
            },
            {
              key: 'margin',
              label: 'Gross margin',
              render: r => {
                const tone = marginTone(r.gross_margin)
                const cls = tone === 'danger' ? 'text-danger font-semibold' : tone === 'warning' ? 'text-warning' : tone === 'success' ? 'text-success' : ''
                return <span className={cls}>{formatPct(r.gross_margin)}</span>
              },
            },
          ]}
        />
      </Section>

      <Section title="Signup cohorts (last 12 months)">
        <Table
          rows={data.cohorts}
          empty="No cohorts yet."
          columns={[
            { key: 'month', label: 'Cohort', render: r => <span className="font-mono text-xs">{r.cohort_month}</span> },
            { key: 'signups', label: 'Signups', render: r => r.signups },
            {
              key: 'active',
              label: 'Active 30d',
              render: r => (
                <span>
                  {r.active_30d} <span className="text-text-muted text-[11px]">({formatPct(r.retention_30d)})</span>
                </span>
              ),
            },
            {
              key: 'paying',
              label: 'Converted',
              render: r => (
                <span>
                  {r.paying_now} <span className="text-text-muted text-[11px]">({formatPct(r.conversion)})</span>
                </span>
              ),
            },
            {
              key: 'cost',
              label: 'Cumulative LLM cost',
              render: r => formatUsd(r.cumulative_llm_cost_usd, 4),
            },
          ]}
        />
      </Section>

      <Section title="Top 20 cost users (window)">
        <Table
          rows={data.top_cost_users}
          empty="Sin actividad LLM en la ventana."
          columns={[
            {
              key: 'user',
              label: 'User',
              render: r => (
                <Link href={`/admin/users/${r.user_id}`} className="hover:text-primary text-xs">
                  {r.email ?? r.user_id.slice(0, 8)}
                </Link>
              ),
            },
            { key: 'plan', label: 'Plan', render: r => <PlanPill plan={r.plan} /> },
            { key: 'calls', label: 'Calls', render: r => r.calls.toLocaleString() },
            {
              key: 'cost',
              label: 'Cost',
              render: r => {
                const danger = r.plan === 'free' && r.cost_usd > 1
                const warn = r.plan === 'free' && r.cost_usd > 0.5
                return (
                  <span className={danger ? 'text-danger font-semibold' : warn ? 'text-warning' : ''}>
                    {formatUsd(r.cost_usd, 4)}
                  </span>
                )
              },
            },
          ]}
        />
      </Section>
    </div>
  )
}
