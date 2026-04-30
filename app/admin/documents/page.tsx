import Link from 'next/link'
import { getAdminFailedDocuments } from '@/lib/admin/rpc'
import { Section, Table, formatDateTime } from '@/components/admin/Stat'
import { RetryButton } from '@/components/admin/RetryButton'

export const dynamic = 'force-dynamic'

export default async function AdminDocumentsPage() {
  const rows = await getAdminFailedDocuments(100)

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <header>
        <h1 className="text-xl font-bold">Failed Documents</h1>
        <p className="text-xs text-text-muted">{rows.length} failed · retry individually via the button on each row</p>
      </header>

      <Section title="Failures (most recent first)">
        <Table
          rows={rows}
          empty="No failed documents."
          columns={[
            {
              key: 'file',
              label: 'File',
              render: r => (
                <div>
                  <div className="font-medium truncate max-w-xs">{r.filename}</div>
                  <div className="text-[11px] text-text-muted">{(Number(r.file_size) / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              ),
            },
            {
              key: 'user',
              label: 'User',
              render: r => r.user_id ? (
                <Link href={`/admin/users/${r.user_id}`} className="hover:text-primary text-xs">
                  {r.email ?? r.user_id.slice(0, 8)}
                </Link>
              ) : <span className="text-text-muted">—</span>,
            },
            {
              key: 'error',
              label: 'Error',
              render: r => (
                <code className="text-[11px] text-danger/80 bg-danger/5 px-1.5 py-0.5 rounded max-w-md truncate inline-block">
                  {r.error_message ?? '—'}
                </code>
              ),
            },
            { key: 'created', label: 'When', render: r => <span className="text-[11px] text-text-muted">{formatDateTime(r.created_at)}</span> },
            { key: 'action', label: '', render: r => <RetryButton documentId={r.id} /> },
          ]}
        />
      </Section>
    </div>
  )
}
