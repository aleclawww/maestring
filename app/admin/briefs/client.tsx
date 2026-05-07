'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'

interface BriefListRow {
  conceptId: string
  conceptName: string
  title: string
  updatedAt: string
  hasDiagram: boolean
  gotchasCount: number
}

export function BriefsAdminClient({ rows }: { rows: BriefListRow[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function remove(conceptId: string, conceptName: string) {
    if (deleting) return
    if (!confirm(`Delete brief for "${conceptName}"? This cannot be undone.`))
      return
    setErr(null)
    setDeleting(conceptId)
    try {
      const res = await fetch(`/api/admin/briefs/${conceptId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        console.error('BriefsAdmin delete failed', {
          status: res.status,
          body: j,
          conceptId,
        })
        setErr(j.error ?? `Failed (HTTP ${res.status})`)
        return
      }
      router.refresh()
    } catch (e) {
      console.error('BriefsAdmin delete network error', { err: e, conceptId })
      setErr('Network error. Try again.')
    } finally {
      setDeleting(null)
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-v2-border bg-v2-surface p-10 text-center text-v2-foreground-subtle">
        No briefs yet. Click <strong>+ New brief</strong> to create the first one.
      </div>
    )
  }

  return (
    <div>
      {err && <div className="mb-4 text-v2-error text-sm">{err}</div>}

      <div className="overflow-hidden rounded-xl border border-v2-border bg-v2-surface">
        <table className="w-full text-sm">
          <thead className="bg-v2-surface-subtle">
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-v2-foreground-subtle">
              <th className="px-4 py-2.5">Concept</th>
              <th className="px-4 py-2.5">Title</th>
              <th className="px-4 py-2.5">Updated</th>
              <th className="px-4 py-2.5">Diagram</th>
              <th className="px-4 py-2.5">Gotchas</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.conceptId}
                className="border-t border-v2-border-subtle"
              >
                <td className="px-4 py-2 font-medium text-v2-foreground">
                  {r.conceptName}
                </td>
                <td className="px-4 py-2 text-v2-foreground-muted">
                  {r.title}
                </td>
                <td className="px-4 py-2 text-v2-foreground-subtle">
                  {new Date(r.updatedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 text-v2-foreground-muted">
                  {r.hasDiagram ? 'Yes' : '—'}
                </td>
                <td className="px-4 py-2 text-v2-foreground-muted">
                  {r.gotchasCount}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/briefs/${r.conceptId}/edit`}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-v2-border bg-v2-surface px-2 text-[12px] font-medium text-v2-foreground-muted transition-colors hover:bg-v2-surface-subtle hover:text-v2-foreground"
                    >
                      <Pencil className="h-3 w-3" strokeWidth={2.25} />
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(r.conceptId, r.conceptName)}
                      disabled={deleting === r.conceptId}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-v2-border bg-v2-surface px-2 text-[12px] font-medium text-v2-foreground-muted transition-colors hover:bg-v2-error-soft hover:text-v2-error disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={2.25} />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
