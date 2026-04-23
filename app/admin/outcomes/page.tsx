import Link from 'next/link'
import { getAdminOutcomes } from '@/lib/admin/rpc'
import { Section, Stat, Table, formatDate } from '@/components/admin/Stat'

export const dynamic = 'force-dynamic'

export default async function AdminOutcomesPage() {
  const data = await getAdminOutcomes()
  const total = data.counts.passed + data.counts.failed
  const passRate = total > 0 ? ((data.counts.passed / total) * 100).toFixed(1) : '—'
  const calibrationProgress = Math.min(100, (total / 500) * 100)

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <header>
        <h1 className="text-xl font-bold">Exam outcomes</h1>
        <p className="text-xs text-text-muted">
          Signal para calibrar P(pass). Con ≥500 outcomes podemos reemplazar la sigmoide heurística por un modelo regresivo real.
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Passed" value={data.counts.passed} tone="success" />
        <Stat label="Failed" value={data.counts.failed} tone="danger" />
        <Stat label="Pass rate" value={`${passRate}${typeof passRate === 'string' && passRate !== '—' ? '%' : ''}`} />
        <Stat label="Pending capture" value={data.counts.pending_capture} tone={data.counts.pending_capture > 0 ? 'warning' : 'default'} />
      </div>

      <Section title={`Calibration progress · ${total}/500`}>
        <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${calibrationProgress}%` }}
          />
        </div>
        <p className="text-xs text-text-muted mt-2">
          {total < 500
            ? `Faltan ${500 - total} outcomes más para recalibrar P(pass) con modelo real.`
            : '✓ Umbral alcanzado — es momento de entrenar modelo real.'}
        </p>
      </Section>

      <Section title="Score distribution (AWS scaled)">
        {data.by_score.length === 0 ? (
          <p className="text-xs text-text-muted">Sin scores reportados aún.</p>
        ) : (
          <div className="space-y-1">
            {data.by_score.map(b => (
              <div key={b.bucket} className="flex items-center gap-2 text-xs">
                <span className="w-24 font-mono text-text-muted">
                  {b.bucket}-{b.bucket + 99}
                </span>
                <div className="flex-1 h-4 bg-surface-2 rounded overflow-hidden">
                  <div
                    className={b.bucket >= 720 ? 'bg-success h-full' : 'bg-danger h-full'}
                    style={{ width: `${(b.n / Math.max(...data.by_score.map(x => x.n))) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right font-mono">{b.n}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Recent reported outcomes">
        <Table
          rows={data.recent}
          empty="Sin outcomes reportados."
          columns={[
            {
              key: 'user',
              label: 'User',
              render: r => (
                <Link href={`/admin/users/${r.user_id}`} className="hover:text-primary text-xs">
                  {r.email}
                </Link>
              ),
            },
            {
              key: 'outcome',
              label: 'Outcome',
              render: r => (
                <span className={r.outcome === 'passed' ? 'text-success font-semibold text-xs' : 'text-danger font-semibold text-xs'}>
                  {r.outcome}
                </span>
              ),
            },
            {
              key: 'score',
              label: 'Score',
              render: r => r.score != null ? <span className="font-mono text-xs">{r.score}</span> : <span className="text-text-muted">—</span>,
            },
            {
              key: 'readiness',
              label: 'Readiness at exam',
              render: r => r.last_readiness != null ? <span className="font-mono text-xs">{Math.round(Number(r.last_readiness))}</span> : <span className="text-text-muted">—</span>,
            },
            { key: 'date', label: 'Date', render: r => <span className="text-[11px] text-text-muted">{formatDate(r.exam_date)}</span> },
          ]}
        />
      </Section>
    </div>
  )
}
