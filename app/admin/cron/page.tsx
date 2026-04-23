import { createAdminClient } from '@/lib/supabase/admin'
import { Section, Table, Stat, formatDateTime } from '@/components/admin/Stat'

export const dynamic = 'force-dynamic'

type CronRun = {
  id: string
  name: string
  started_at: string
  ended_at: string | null
  status: 'running' | 'ok' | 'failed' | 'skipped'
  rows_affected: number | null
  error: string | null
  metadata: Record<string, unknown> | null
}

export default async function AdminCronRunsPage({
  searchParams,
}: {
  searchParams?: { status?: string; name?: string }
}) {
  const supabase = createAdminClient()

  let query = supabase
    .from('cron_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(200)

  if (searchParams?.status) query = query.eq('status', searchParams.status)
  if (searchParams?.name) query = query.eq('name', searchParams.name)

  const { data: rows } = await query

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: summary } = await supabase
    .from('cron_runs')
    .select('name, status')
    .gte('started_at', sevenDaysAgo)

  const byStatus = { ok: 0, failed: 0, skipped: 0, running: 0 }
  const byName: Record<string, { ok: number; failed: number }> = {}
  for (const r of summary ?? []) {
    byStatus[r.status as keyof typeof byStatus] =
      (byStatus[r.status as keyof typeof byStatus] ?? 0) + 1
    byName[r.name] ??= { ok: 0, failed: 0 }
    if (r.status === 'ok') byName[r.name]!.ok++
    if (r.status === 'failed') byName[r.name]!.failed++
  }

  const list = (rows ?? []) as CronRun[]

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <header>
        <h1 className="text-xl font-bold">Cron Runs</h1>
        <p className="text-xs text-text-muted">
          Ledger of every cron invocation. A silent failure here is a user-visible miss
          (undelivered email, empty pool, stale snapshot).
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Last 7d · OK" value={byStatus.ok} tone="success" />
        <Stat
          label="Last 7d · Failed"
          value={byStatus.failed}
          tone={byStatus.failed > 0 ? 'danger' : 'default'}
        />
        <Stat label="Last 7d · Skipped" value={byStatus.skipped} />
        <Stat
          label="Currently running"
          value={byStatus.running}
          tone={byStatus.running > 3 ? 'warning' : 'default'}
        />
      </div>

      <Section title="Per-cron summary (last 7d)">
        <div className="flex flex-wrap gap-2">
          {Object.entries(byName)
            .sort((a, b) => b[1].failed - a[1].failed)
            .map(([name, v]) => (
              <a
                key={name}
                href={`/admin/cron?name=${encodeURIComponent(name)}`}
                className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs hover:border-primary"
              >
                <code className="font-mono">{name}</code>{' '}
                <span className="text-success">{v.ok}✓</span>
                {v.failed > 0 && <span className="text-danger ml-1">{v.failed}✗</span>}
              </a>
            ))}
        </div>
      </Section>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-text-muted">Filter:</span>
        <a
          href="/admin/cron"
          className="rounded-md border border-border px-2 py-1 hover:border-primary"
        >
          All
        </a>
        <a
          href="/admin/cron?status=failed"
          className="rounded-md border border-border px-2 py-1 hover:border-primary"
        >
          Failed
        </a>
        <a
          href="/admin/cron?status=ok"
          className="rounded-md border border-border px-2 py-1 hover:border-primary"
        >
          OK
        </a>
        <a
          href="/admin/cron?status=skipped"
          className="rounded-md border border-border px-2 py-1 hover:border-primary"
        >
          Skipped
        </a>
        {(searchParams?.name || searchParams?.status) && (
          <span className="ml-2 text-text-muted">
            Active filter: {searchParams?.name ?? ''} {searchParams?.status ?? ''}
          </span>
        )}
      </div>

      <Section title={`Last ${list.length} runs`}>
        <Table
          rows={list}
          empty="No cron runs yet."
          columns={[
            {
              key: 'started_at',
              label: 'Started',
              render: r => (
                <span className="text-[11px] text-text-muted">{formatDateTime(r.started_at)}</span>
              ),
            },
            {
              key: 'name',
              label: 'Name',
              render: r => (
                <code className="text-[11px] bg-surface-2 px-1.5 py-0.5 rounded">{r.name}</code>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              render: r => {
                const tone =
                  r.status === 'ok'
                    ? 'text-success'
                    : r.status === 'failed'
                    ? 'text-danger'
                    : r.status === 'skipped'
                    ? 'text-text-muted'
                    : 'text-warning'
                return <span className={`text-xs font-semibold ${tone}`}>{r.status}</span>
              },
            },
            {
              key: 'duration',
              label: 'Duration',
              render: r => {
                if (!r.ended_at) return <span className="text-xs text-warning">—</span>
                const ms = new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()
                return (
                  <span className="text-xs text-text-muted">
                    {ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`}
                  </span>
                )
              },
            },
            {
              key: 'rows',
              label: 'Rows',
              render: r => (
                <span className="text-xs text-text-muted">{r.rows_affected ?? '—'}</span>
              ),
            },
            {
              key: 'detail',
              label: 'Detail',
              render: r =>
                r.error ? (
                  <code className="text-[11px] text-danger truncate max-w-md inline-block">
                    {r.error}
                  </code>
                ) : r.metadata ? (
                  <code className="text-[11px] text-text-muted truncate max-w-md inline-block">
                    {JSON.stringify(r.metadata)}
                  </code>
                ) : (
                  <span className="text-text-muted">—</span>
                ),
            },
          ]}
        />
      </Section>
    </div>
  )
}
