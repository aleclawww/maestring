import Link from 'next/link'
import { getAdminRecentActions } from '@/lib/admin/rpc'
import { Section, Table, formatDateTime } from '@/components/admin/Stat'

export const dynamic = 'force-dynamic'

export default async function AdminActionsLogPage() {
  const rows = await getAdminRecentActions(200)

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <header>
        <h1 className="text-xl font-bold">Audit Log</h1>
        <p className="text-xs text-text-muted">
          Toda acción destructiva (grant_pro, retry_doc, etc.) queda aquí. Read-only.
        </p>
      </header>

      <Section title={`Last ${rows.length} actions`}>
        <Table
          rows={rows}
          empty="No hay acciones registradas."
          columns={[
            { key: 'when', label: 'When', render: r => <span className="text-[11px] text-text-muted">{formatDateTime(r.created_at)}</span> },
            { key: 'admin', label: 'Admin', render: r => <span className="text-xs">{r.admin_email ?? 'unknown'}</span> },
            { key: 'action', label: 'Action', render: r => <code className="text-[11px] bg-surface-2 px-1.5 py-0.5 rounded">{r.action}</code> },
            {
              key: 'target',
              label: 'Target',
              render: r => r.target_user_id ? (
                <Link href={`/admin/users/${r.target_user_id}`} className="text-xs text-primary hover:underline">
                  {r.target_user_id.slice(0, 8)}…
                </Link>
              ) : <span className="text-text-muted">—</span>,
            },
            {
              key: 'details',
              label: 'Details',
              render: r => r.details ? (
                <code className="text-[11px] text-text-muted truncate max-w-md inline-block">
                  {JSON.stringify(r.details)}
                </code>
              ) : <span className="text-text-muted">—</span>,
            },
          ]}
        />
      </Section>
    </div>
  )
}
