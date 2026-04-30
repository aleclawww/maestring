'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type Concept = { id: string; slug: string; name: string; approvedCount: number }

type PendingRow = {
  id: string
  concept_id: string
  question_text: string
  options: string[]
  correct_index: number
  explanation: string
  difficulty: number
  review_status: 'pending' | 'approved' | 'rejected'
  created_at: string
  source: string
}

type RejectedRow = Omit<PendingRow, 'source'> & { reject_reason: string | null }

type Tab = 'pending' | 'generate' | 'rejected'

export function QuestionsAdminClient({
  concepts,
  pending,
  rejected,
}: {
  concepts: Concept[]
  pending: PendingRow[]
  rejected: RejectedRow[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('pending')
  const [busy, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const conceptById = useMemo(() => {
    const m = new Map<string, Concept>()
    for (const c of concepts) m.set(c.id, c)
    return m
  }, [concepts])

  async function review(id: string, body: Record<string, unknown>) {
    setErr(null)
    // Previously: no try/catch. A rejected fetch bubbled as an unhandled
    // promise rejection and the moderator saw nothing — dangerous for a
    // review queue where "I approved that" is load-bearing.
    try {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
      if (!res.ok) {
        console.error('QuestionsAdmin review failed', { status: res.status, body: j, id })
        setErr(j.message ?? j.error ?? `Failed (HTTP ${res.status})`)
        return
      }
      startTransition(() => router.refresh())
    } catch (err) {
      console.error('QuestionsAdmin review network error', { err, id })
      setErr('Network error. Check your connection and try again.')
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete permanently?')) return
    setErr(null)
    try {
      const res = await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
        console.error('QuestionsAdmin delete failed', { status: res.status, body: j, id })
        setErr(j.message ?? j.error ?? `Failed to delete (HTTP ${res.status})`)
        return
      }
      startTransition(() => router.refresh())
    } catch (err) {
      console.error('QuestionsAdmin delete network error', { err, id })
      setErr('Network error. Check your connection and try again.')
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['pending', 'generate', 'rejected'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm transition-colors',
              tab === t ? 'bg-primary text-white' : 'border border-border text-text-secondary hover:bg-surface-2',
            )}
          >
            {t === 'pending' && `Pending (${pending.length})`}
            {t === 'generate' && 'Batch generate'}
            {t === 'rejected' && `Rejected (${rejected.length})`}
          </button>
        ))}
      </div>

      {err && <div className="mb-4 text-danger text-sm">{err}</div>}

      {tab === 'generate' && <BatchGenerate concepts={concepts} onDone={() => startTransition(() => router.refresh())} />}

      {tab === 'pending' && (
        <div className="space-y-3">
          {pending.length === 0 && (
            <div className="rounded-xl border border-border bg-surface p-10 text-center text-text-muted">
              Empty queue. Nothing to approve.
            </div>
          )}
          {pending.map((q) => (
            <QuestionCard
              key={q.id}
              q={q}
              concept={conceptById.get(q.concept_id)}
              editing={editingId === q.id}
              onEditToggle={() => setEditingId(editingId === q.id ? null : q.id)}
              onApprove={() => review(q.id, { status: 'approved' })}
              onReject={(reason) => review(q.id, { status: 'rejected', rejectReason: reason })}
              onSaveEdits={(edits) => review(q.id, { edits }).then(() => setEditingId(null))}
              onDelete={() => remove(q.id)}
              busy={busy}
            />
          ))}
        </div>
      )}

      {tab === 'rejected' && (
        <div className="space-y-3">
          {rejected.length === 0 && (
            <div className="rounded-xl border border-border bg-surface p-10 text-center text-text-muted">
              Nothing rejected.
            </div>
          )}
          {rejected.map((q) => (
            <div key={q.id} className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-text-muted mb-1">
                {conceptById.get(q.concept_id)?.name ?? q.concept_id} ·{' '}
                {new Date(q.created_at).toLocaleDateString()}
              </p>
              <p className="text-sm text-text-secondary mb-2">{q.question_text}</p>
              {q.reject_reason && (
                <p className="text-xs text-danger mb-2">Reason: {q.reject_reason}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => review(q.id, { status: 'approved' })}
                  disabled={busy}
                  className="btn-outline text-xs px-3 py-1.5"
                >
                  Restore
                </button>
                <button
                  onClick={() => remove(q.id)}
                  disabled={busy}
                  className="btn-outline text-xs px-3 py-1.5 text-danger hover:bg-danger/10"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function QuestionCard({
  q,
  concept,
  editing,
  onEditToggle,
  onApprove,
  onReject,
  onSaveEdits,
  onDelete,
  busy,
}: {
  q: PendingRow
  concept: Concept | undefined
  editing: boolean
  onEditToggle: () => void
  onApprove: () => void
  onReject: (reason: string) => void
  onSaveEdits: (edits: Record<string, unknown>) => void
  onDelete: () => void
  busy: boolean
}) {
  const [qt, setQt] = useState(q.question_text)
  const [opts, setOpts] = useState<string[]>(q.options)
  const [correct, setCorrect] = useState(q.correct_index)
  const [expl, setExpl] = useState(q.explanation)
  const [diff, setDiff] = useState(q.difficulty)
  const [rejectReason, setRejectReason] = useState('')

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-text-muted">
          {concept?.name ?? q.concept_id} · pool: {concept?.approvedCount ?? 0} · diff {q.difficulty.toFixed(2)} ·{' '}
          {new Date(q.created_at).toLocaleDateString()}
        </p>
        <span className="text-xs px-2 py-0.5 rounded bg-warning/20 text-warning">pending</span>
      </div>

      {!editing ? (
        <>
          <p className="text-sm mb-2 leading-relaxed">{q.question_text}</p>
          <ul className="text-sm space-y-1 mb-3">
            {q.options.map((o, i) => (
              <li
                key={i}
                className={cn(
                  'px-2 py-1 rounded',
                  i === q.correct_index ? 'bg-success/10 border border-success/30 text-success' : 'text-text-secondary',
                )}
              >
                <span className="font-mono text-xs mr-2">{String.fromCharCode(65 + i)}.</span>
                {o}
              </li>
            ))}
          </ul>
          <p className="text-xs text-text-muted leading-relaxed mb-3 whitespace-pre-wrap">{q.explanation}</p>
        </>
      ) : (
        <div className="space-y-2 mb-3">
          <textarea
            value={qt}
            onChange={(e) => setQt(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
          />
          {opts.map((o, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="radio"
                checked={correct === i}
                onChange={() => setCorrect(i)}
                title="Mark as correct"
              />
              <input
                value={o}
                onChange={(e) => {
                  const n = [...opts]
                  n[i] = e.target.value
                  setOpts(n)
                }}
                className="flex-1 rounded border border-border bg-surface-2 px-2 py-1 text-sm"
              />
            </div>
          ))}
          <textarea
            value={expl}
            onChange={(e) => setExpl(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
            placeholder="Explanation"
          />
          <label className="text-xs text-text-muted flex items-center gap-2">
            Difficulty
            <input
              type="number"
              step="0.05"
              min={0}
              max={1}
              value={diff}
              onChange={(e) => setDiff(Number(e.target.value))}
              className="w-20 rounded border border-border bg-surface-2 px-2 py-1 text-sm"
            />
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        {!editing ? (
          <>
            <button onClick={onApprove} disabled={busy} className="btn-primary text-xs px-3 py-1.5">
              Approve
            </button>
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (optional)"
              className="text-xs rounded border border-border bg-surface-2 px-2 py-1"
            />
            <button
              onClick={() => onReject(rejectReason)}
              disabled={busy}
              className="btn-outline text-xs px-3 py-1.5"
            >
              Reject
            </button>
            <button onClick={onEditToggle} disabled={busy} className="btn-outline text-xs px-3 py-1.5">
              Edit
            </button>
            <button
              onClick={onDelete}
              disabled={busy}
              className="btn-outline text-xs px-3 py-1.5 text-danger hover:bg-danger/10"
            >
              Delete
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() =>
                onSaveEdits({
                  question_text: qt,
                  options: opts,
                  correct_index: correct,
                  explanation: expl,
                  difficulty: diff,
                })
              }
              disabled={busy}
              className="btn-primary text-xs px-3 py-1.5"
            >
              Save changes
            </button>
            <button onClick={onEditToggle} disabled={busy} className="btn-outline text-xs px-3 py-1.5">
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function BatchGenerate({ concepts, onDone }: { concepts: Concept[]; onDone: () => void }) {
  const [conceptId, setConceptId] = useState(concepts[0]?.id ?? '')
  const [count, setCount] = useState(5)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ generated: number; failed: number } | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function run() {
    setRunning(true)
    setErr(null)
    setResult(null)
    // Previously: no try/catch and setRunning(false) only fired on the happy
    // path. A rejected fetch (Anthropic timeout, Vercel Node function
    // cold-start 502, network blip) left the "Generando…" spinner stuck
    // forever, the button disabled, and the admin had to hard-refresh.
    // Because this path also hits Claude Haiku for N concepts, cold-start
    // timeouts are the most common failure — exactly when visible feedback
    // matters most. Move setRunning(false) into finally and wrap in
    // try/catch so a rejection surfaces a real message and the form is
    // usable again.
    try {
      const res = await fetch('/api/admin/questions/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptId, count }),
      })
      const j = (await res.json().catch(() => ({}))) as {
        generated?: number
        failed?: number
        error?: string
        message?: string
      }
      if (!res.ok) {
        console.error('BatchGenerate failed', { status: res.status, body: j, conceptId, count })
        setErr(j.message ?? j.error ?? `Failed (HTTP ${res.status})`)
        return
      }
      setResult({ generated: j.generated ?? 0, failed: j.failed ?? 0 })
      onDone()
    } catch (err) {
      console.error('BatchGenerate network error', { err, conceptId, count })
      setErr('Network error while generating. Check your connection and try again.')
    } finally {
      setRunning(false)
    }
  }

  // Sort concepts: thinnest pools first — they're the ones that need topping up.
  const sorted = [...concepts].sort((a, b) => a.approvedCount - b.approvedCount)

  return (
    <div className="rounded-xl border border-border bg-surface p-5 max-w-xl">
      <h2 className="font-semibold mb-2">Generate batch</h2>
      <p className="text-xs text-text-muted mb-4">
        Triggers question generation via Claude Haiku. Questions will appear in &ldquo;Pending&rdquo; for review.
      </p>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-text-muted">Concept (ordered by emptiest pool)</label>
          <select
            value={conceptId}
            onChange={(e) => setConceptId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
          >
            {sorted.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.approvedCount} approved
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-text-muted">Quantity (1–20)</label>
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="mt-1 w-32 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
          />
        </div>
        <button onClick={run} disabled={running || !conceptId} className="btn-primary text-sm">
          {running ? 'Generating…' : 'Generate'}
        </button>
        {err && <div className="text-danger text-sm">{err}</div>}
        {result && (
          <div className="text-sm text-success">
            Generated: {result.generated} · Failed: {result.failed}
          </div>
        )}
      </div>
    </div>
  )
}
