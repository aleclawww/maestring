import Link from 'next/link'
import { getAdminLlmUsage } from '@/lib/admin/rpc'
import { Section, Table, formatUsd } from '@/components/admin/Stat'

export const dynamic = 'force-dynamic'

export default async function AdminLlmPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>
}) {
  const days = Math.max(1, Math.min(90, Number(searchParams['days'] ?? 14)))
  const data = await getAdminLlmUsage(days)

  const totalCost = data.by_day.reduce((s, d) => s + Number(d.cost_usd), 0)
  const totalCalls = data.by_day.reduce((s, d) => s + d.calls, 0)
  const maxDay = Math.max(1, ...data.by_day.map(d => Number(d.cost_usd)))

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">LLM Usage</h1>
          <p className="text-xs text-text-muted">{days} días · {totalCalls.toLocaleString()} calls · {formatUsd(totalCost)} total</p>
        </div>
        <div className="flex gap-1 text-xs">
          {[7, 14, 30, 90].map(n => (
            <Link key={n} href={`/admin/llm?days=${n}`} className={`px-2 py-1 rounded ${n === days ? 'bg-primary/15 text-primary' : 'text-text-muted hover:bg-surface-2'}`}>
              {n}d
            </Link>
          ))}
        </div>
      </header>

      <Section title="Daily spend">
        {data.by_day.length === 0 ? (
          <p className="text-xs text-text-muted">Sin datos en el rango.</p>
        ) : (
          <div className="flex items-end gap-1 h-28">
            {data.by_day.map(d => {
              const h = Math.max(2, (Number(d.cost_usd) / maxDay) * 100)
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center group relative">
                  <div
                    className="w-full rounded-t bg-primary/70 group-hover:bg-primary transition-colors"
                    style={{ height: `${h}%` }}
                  />
                  <span className="text-[9px] text-text-muted mt-1 rotate-[-25deg] origin-top-left whitespace-nowrap">
                    {d.day.slice(5)}
                  </span>
                  <span className="absolute bottom-full mb-1 hidden group-hover:block bg-surface-2 border border-border rounded px-2 py-1 text-[11px] whitespace-nowrap z-10">
                    {formatUsd(Number(d.cost_usd))} · {d.calls.toLocaleString()} calls
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      <div className="grid md:grid-cols-2 gap-4">
        <Section title="By route">
          <Table
            rows={data.by_route}
            columns={[
              { key: 'route', label: 'Route', render: r => <span className="font-mono text-xs">{r.route}</span> },
              { key: 'calls', label: 'Calls', render: r => r.calls.toLocaleString() },
              { key: 'cost', label: 'Cost', render: r => formatUsd(Number(r.cost_usd)) },
              {
                key: 'error',
                label: 'Error %',
                render: r => (
                  <span className={Number(r.error_rate) > 2 ? 'text-danger' : Number(r.error_rate) > 0 ? 'text-warning' : 'text-success'}>
                    {Number(r.error_rate).toFixed(1)}%
                  </span>
                ),
              },
            ]}
          />
        </Section>

        <Section title="By model">
          <Table
            rows={data.by_model}
            columns={[
              { key: 'model', label: 'Model', render: r => <span className="font-mono text-xs">{r.model}</span> },
              { key: 'calls', label: 'Calls', render: r => r.calls.toLocaleString() },
              { key: 'cost', label: 'Cost', render: r => formatUsd(Number(r.cost_usd)) },
            ]}
          />
        </Section>
      </div>

      <Section title="Top spenders">
        <Table
          rows={data.top_spenders}
          columns={[
            {
              key: 'user',
              label: 'User',
              render: r => (
                <Link href={`/admin/users/${r.user_id}`} className="hover:text-primary">
                  {r.email ?? r.user_id.slice(0, 8)}
                </Link>
              ),
            },
            { key: 'calls', label: 'Calls', render: r => r.calls.toLocaleString() },
            {
              key: 'cost',
              label: 'Cost',
              render: r => (
                <span className={Number(r.cost_usd) > 5 ? 'text-danger font-semibold' : Number(r.cost_usd) > 2 ? 'text-warning' : ''}>
                  {formatUsd(Number(r.cost_usd))}
                </span>
              ),
            },
          ]}
        />
      </Section>
    </div>
  )
}
