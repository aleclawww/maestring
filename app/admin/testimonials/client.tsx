'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type Row = {
  id: string
  user_id: string | null
  user_email: string | null
  display_name: string
  role: string | null
  content: string
  stars: number
  status: 'pending' | 'approved' | 'rejected'
  featured: boolean
  submitted_at: string
  reviewed_at: string | null
  exam_passed: boolean | null
  scaled_score: number | null
}

type Tab = 'pending' | 'approved' | 'rejected' | 'all'

export function TestimonialsAdminClient({ rows }: { rows: Row[] }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('pending')
  const [busy, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const filtered = tab === 'all' ? rows : rows.filter((r) => r.status === tab)

  async function patch(id: string, body: Record<string, unknown>) {
    setErr(null)
    // Previously: no try/catch. A rejected fetch (network blip, Vercel 502
    // during a deploy) bubbled as an unhandled promise rejection and the
    // admin saw nothing — the card silently stayed in its old status while
    // moderator believed the approve/reject had landed. Surface it inline.
    try {
      const res = await fetch(`/api/admin/testimonials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
      if (!res.ok) {
        console.error('TestimonialsAdmin patch failed', { status: res.status, body: j, id })
        setErr(j.message ?? j.error ?? `Failed (HTTP ${res.status})`)
        return
      }
      startTransition(() => router.refresh())
    } catch (err) {
      console.error('TestimonialsAdmin patch network error', { err, id })
      setErr('Network error. Check your connection and try again.')
    }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar definitivamente?')) return
    setErr(null)
    try {
      const res = await fetch(`/api/admin/testimonials/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
        console.error('TestimonialsAdmin delete failed', { status: res.status, body: j, id })
        setErr(j.message ?? j.error ?? `Failed to delete (HTTP ${res.status})`)
        return
      }
      startTransition(() => router.refresh())
    } catch (err) {
      console.error('TestimonialsAdmin delete network error', { err, id })
      setErr('Network error. Check your connection and try again.')
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm transition-colors',
              tab === t ? 'bg-primary text-white' : 'border border-border text-text-secondary hover:bg-surface-2'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {err && <div className="mb-4 text-danger text-sm">{err}</div>}

      {filtered.length === 0 && (
        <div className="rounded-xl border border-border bg-surface p-10 text-center text-text-muted">
          Nada en esta categoría.
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <p className="font-semibold">
                  {r.display_name}{' '}
                  {r.role && <span className="text-text-muted font-normal">· {r.role}</span>}
                </p>
                <p className="text-xs text-text-muted">
                  {r.user_email} · {new Date(r.submitted_at).toLocaleDateString()}
                  {r.exam_passed && r.scaled_score && ` · Passed ${r.scaled_score}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 text-sm">{'★'.repeat(r.stars)}</span>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded',
                    r.status === 'approved' && 'bg-success/20 text-success',
                    r.status === 'pending' && 'bg-warning/20 text-warning',
                    r.status === 'rejected' && 'bg-surface-2 text-text-muted'
                  )}
                >
                  {r.status}
                </span>
                {r.featured && (
                  <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">featured</span>
                )}
              </div>
            </div>
            <p className="text-sm text-text-secondary mb-3 leading-relaxed">&ldquo;{r.content}&rdquo;</p>
            <div className="flex flex-wrap gap-2">
              {r.status !== 'approved' && (
                <button
                  onClick={() => patch(r.id, { status: 'approved' })}
                  disabled={busy}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  Aprobar
                </button>
              )}
              {r.status !== 'rejected' && (
                <button
                  onClick={() => patch(r.id, { status: 'rejected' })}
                  disabled={busy}
                  className="btn-outline text-xs px-3 py-1.5"
                >
                  Rechazar
                </button>
              )}
              {r.status === 'approved' && (
                <button
                  onClick={() => patch(r.id, { featured: !r.featured })}
                  disabled={busy}
                  className="btn-outline text-xs px-3 py-1.5"
                >
                  {r.featured ? 'Quitar featured' : 'Marcar featured'}
                </button>
              )}
              <button
                onClick={() => remove(r.id)}
                disabled={busy}
                className="btn-outline text-xs px-3 py-1.5 text-danger hover:bg-danger/10"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
