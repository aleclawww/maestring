import Link from 'next/link'
import { getAdminOverview } from '@/lib/admin/rpc'
import { Stat, Section, formatUsd } from '@/components/admin/Stat'

export const dynamic = 'force-dynamic'

export default async function AdminOverviewPage() {
  const o = await getAdminOverview()

  const mrrUsd = o.mrr_usd_cents / 100
  const arrProjected = mrrUsd * 12
  const conversion =
    o.users_onboarded > 0 ? ((o.subs_active / o.users_onboarded) * 100).toFixed(1) : '0.0'
  const activation =
    o.users_total > 0 ? ((o.users_onboarded / o.users_total) * 100).toFixed(1) : '0.0'
  const completionRate =
    o.sessions_7d > 0 ? ((o.sessions_completed_7d / o.sessions_7d) * 100).toFixed(0) : '0'
  const poolToneWarn = o.pool_coverage < 80
  const errToneWarn = o.llm_error_rate_24h > 2
  const spendToneWarn = o.llm_spend_today_usd > 50

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <header>
        <h1 className="text-xl font-bold">Overview</h1>
        <p className="text-xs text-text-muted">Live metrics · refrescado en cada carga</p>
      </header>

      {/* Money row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="MRR" value={formatUsd(mrrUsd)} hint={`ARR proj. ${formatUsd(arrProjected, 0)}`} tone="success" />
        <Stat label="Active subs" value={o.subs_active} hint={Object.entries(o.subs_by_plan).map(([k, v]) => `${k}:${v}`).join(' · ') || 'none'} />
        <Stat label="Free→Paid" value={`${conversion}%`} hint={`${o.subs_active} of ${o.users_onboarded} onboarded`} />
        <Stat label="LLM spend today" value={formatUsd(o.llm_spend_today_usd)} hint={`7d ${formatUsd(o.llm_spend_7d_usd)} · 30d ${formatUsd(o.llm_spend_30d_usd)}`} tone={spendToneWarn ? 'warning' : 'default'} />
      </div>

      {/* Growth row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Users total" value={o.users_total} hint={`${o.new_signups_7d} nuevos 7d`} />
        <Stat label="Onboarding rate" value={`${activation}%`} hint={`${o.users_onboarded} of ${o.users_total}`} />
        <Stat label="MAU" value={o.mau} />
        <Stat label="DAU" value={o.dau} hint={o.mau > 0 ? `DAU/MAU ${((o.dau / o.mau) * 100).toFixed(0)}%` : undefined} />
      </div>

      {/* Health row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Sessions 7d" value={o.sessions_7d} hint={`${completionRate}% completed`} />
        <Stat label="LLM error rate 24h" value={`${o.llm_error_rate_24h}%`} tone={errToneWarn ? 'danger' : 'success'} />
        <Stat label="Docs processing" value={o.docs_processing} hint={`${o.docs_failed_7d} failed 7d`} tone={o.docs_failed_7d > 0 ? 'warning' : 'default'} />
        <Stat label="Pool coverage" value={`${o.pool_coverage}%`} hint={`${o.pool_size} active questions`} tone={poolToneWarn ? 'warning' : 'success'} />
      </div>

      {/* Outcomes row (for calibration) */}
      <Section
        title="Exam outcomes (calibration signal)"
        action={<Link href="/admin/outcomes" className="text-xs text-primary hover:underline">View detail →</Link>}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Passed" value={o.outcomes_passed} tone="success" />
          <Stat label="Failed" value={o.outcomes_failed} tone="danger" />
          <Stat label="Pending capture" value={o.outcomes_pending} hint="Exam date passed, outcome unknown" tone={o.outcomes_pending > 0 ? 'warning' : 'default'} />
          <Stat label="Total signal" value={o.outcomes_passed + o.outcomes_failed} hint="≥500 to recalibrate P(pass)" />
        </div>
      </Section>

      {/* Alerts */}
      <div className="space-y-2">
        {poolToneWarn && (
          <AlertRow tone="warning">
            <strong>Pool coverage {o.pool_coverage}%</strong> — below 80% means users exhaust pool questions and fall back to on-the-fly generation. Run <code className="px-1 bg-surface-2 rounded">seed-question-pool</code>.
          </AlertRow>
        )}
        {spendToneWarn && (
          <AlertRow tone="warning">
            <strong>LLM spend today ≥ ${o.llm_spend_today_usd.toFixed(2)}</strong> — check top spenders at /admin/llm.
          </AlertRow>
        )}
        {errToneWarn && (
          <AlertRow tone="danger">
            <strong>LLM error rate {o.llm_error_rate_24h}%</strong> in the last 24h. Investigate in Sentry.
          </AlertRow>
        )}
        {o.outcomes_pending > 0 && (
          <AlertRow tone="info">
            <strong>{o.outcomes_pending} users</strong> with a past exam date and no reported outcome. The dashboard banner already prompts them — monitor.
          </AlertRow>
        )}
      </div>
    </div>
  )
}

function AlertRow({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'info' | 'warning' | 'danger'
}) {
  const map = {
    info: 'border-primary/30 bg-primary/5 text-text-secondary',
    warning: 'border-warning/30 bg-warning/10 text-warning',
    danger: 'border-danger/30 bg-danger/10 text-danger',
  }
  return <div className={`rounded-lg border px-4 py-2.5 text-xs ${map[tone]}`}>{children}</div>
}
