import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminUserDetail } from '@/lib/admin/rpc'
import { Section, Stat, formatUsd, formatDate, formatDateTime, PlanPill } from '@/components/admin/Stat'
import { GrantProButton } from '@/components/admin/GrantProButton'

export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const detail = (await getAdminUserDetail(params.id)) as AnyObj | null
  if (!detail) notFound()

  const profile: AnyObj = detail['profile'] ?? {}
  const email: string = detail['email'] ?? '—'
  const sub: AnyObj | null = detail['subscription']
  const readiness: AnyObj | null = detail['readiness']
  const spend: { today: number; '7d': number; '30d': number } = detail['llm_spend']
  const sessions: AnyObj[] = detail['sessions_30d'] ?? []
  const docs: AnyObj[] = detail['documents'] ?? []
  const plan = sub?.['plan'] ?? 'free'

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <header className="flex items-start justify-between">
        <div>
          <Link href="/admin/users" className="text-xs text-primary hover:underline">← Users</Link>
          <h1 className="text-xl font-bold mt-1">{email}</h1>
          <p className="text-sm text-text-muted">{profile['full_name'] ?? '—'} · {params.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <PlanPill plan={plan} />
          {profile['onboarding_completed'] ? (
            <span className="text-[10px] uppercase text-success">onboarded</span>
          ) : (
            <span className="text-[10px] uppercase text-warning">not onboarded</span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Readiness" value={readiness?.['score'] != null ? Math.round(readiness['score']) : '—'} hint={readiness?.['pass_probability'] != null ? `P(pass) ${Math.round(readiness['pass_probability'] * 100)}%` : undefined} />
        <Stat label="Streak" value={`${profile['current_streak'] ?? 0}d`} />
        <Stat label="XP" value={(profile['total_xp'] ?? 0).toLocaleString()} />
        <Stat
          label="LLM 30d"
          value={formatUsd(spend['30d'])}
          hint={`today ${formatUsd(spend.today)} · 7d ${formatUsd(spend['7d'])}`}
          tone={spend['30d'] > 3 ? 'warning' : 'default'}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Section title="Profile">
          <dl className="text-xs space-y-1.5">
            <Row k="Journey phase" v={profile['journey_phase']} />
            <Row k="Exam date" v={formatDate(profile['exam_target_date'])} />
            <Row k="Exam outcome" v={profile['exam_outcome'] ?? '—'} />
            <Row k="Exam score" v={profile['exam_scaled_score'] ?? '—'} />
            <Row k="Study min/day" v={profile['study_minutes_per_day'] ?? '—'} />
            <Row k="Last readiness" v={profile['last_readiness_score'] ?? '—'} />
            <Row k="Last readiness at" v={formatDateTime(profile['last_readiness_at'])} />
            <Row k="Signup" v={formatDateTime(profile['created_at'])} />
            <Row k="Referral code" v={profile['referral_code'] ?? '—'} />
          </dl>
        </Section>

        <Section title="Subscription">
          {sub ? (
            <dl className="text-xs space-y-1.5">
              <Row k="Plan" v={plan} />
              <Row k="Status" v={sub['status']} />
              <Row k="Period start" v={formatDateTime(sub['current_period_start'])} />
              <Row k="Period end" v={formatDateTime(sub['current_period_end'])} />
              <Row k="Cancel at end" v={String(sub['cancel_at_period_end'])} />
              <Row k="Stripe customer" v={sub['stripe_customer_id'] ?? '—'} />
              <Row k="Stripe sub id" v={sub['stripe_subscription_id'] ?? '—'} />
            </dl>
          ) : (
            <p className="text-xs text-text-muted">Sin suscripción activa.</p>
          )}
          <div className="mt-4">
            <GrantProButton userId={params.id} />
          </div>
        </Section>
      </div>

      <Section title={`Sessions (last 30d) · ${sessions.length}`}>
        {sessions.length === 0 ? (
          <p className="text-xs text-text-muted">Sin actividad.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
            {sessions.slice(0, 10).map((s, i) => (
              <div key={i} className="rounded-md border border-border px-2 py-1.5">
                <p className="text-text-muted">{formatDateTime(s['created_at'])}</p>
                <p>
                  <span className={s['status'] === 'completed' ? 'text-success' : 'text-text-muted'}>
                    {s['status']}
                  </span>
                </p>
                <p className="text-text-muted">{s['questions_answered'] ?? 0} Q · {s['xp_earned'] ?? 0} XP</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={`Documents · ${docs.length}`}>
        {docs.length === 0 ? (
          <p className="text-xs text-text-muted">Sin documentos.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {docs.map((d, i) => (
              <li key={i} className="flex items-center justify-between border-b border-border/60 py-1.5">
                <span className="truncate">{d['filename']}</span>
                <span className={d['processing_status'] === 'failed' ? 'text-danger' : d['processing_status'] === 'completed' ? 'text-success' : 'text-text-muted'}>
                  {d['processing_status']}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="text-text-muted w-32 shrink-0">{k}</dt>
      <dd className="text-text-primary truncate">{v ?? '—'}</dd>
    </div>
  )
}
