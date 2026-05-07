'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BriefFormValues {
  title: string
  bodyMd: string
  gotchas: string[]
  relatedConceptIds: string[]
  diagramUrl: string | null
}

export interface ConceptOption {
  id: string
  name: string
  slug: string
}

interface BriefEditorProps {
  mode: 'new' | 'edit'
  /** For mode='edit', the locked concept (UUID + display name). For mode='new', null until the user picks one from `availableConcepts`. */
  conceptId: string | null
  conceptName?: string
  /** Initial form values (empty defaults for new). */
  initial: BriefFormValues
  /** All concepts in the cert — used for the relatedConceptIds checkbox list. */
  allConcepts: ConceptOption[]
  /** For mode='new', the subset of `allConcepts` that don't yet have a brief. */
  availableConcepts?: ConceptOption[]
}

export function BriefEditor({
  mode,
  conceptId: initialConceptId,
  conceptName,
  initial,
  allConcepts,
  availableConcepts,
}: BriefEditorProps) {
  const router = useRouter()
  const [conceptId, setConceptId] = useState<string | null>(initialConceptId)
  const [title, setTitle] = useState(initial.title)
  const [bodyMd, setBodyMd] = useState(initial.bodyMd)
  const [gotchas, setGotchas] = useState<string[]>(initial.gotchas)
  const [relatedIds, setRelatedIds] = useState<string[]>(initial.relatedConceptIds)
  const [diagramUrl, setDiagramUrl] = useState(initial.diagramUrl ?? '')
  const [relatedSearch, setRelatedSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const filteredRelated = useMemo(() => {
    const q = relatedSearch.trim().toLowerCase()
    const list = q
      ? allConcepts.filter(
          (c) =>
            c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
        )
      : allConcepts
    // Selected items first, then alphabetical.
    const selectedSet = new Set(relatedIds)
    return [...list].sort((a, b) => {
      const aSel = selectedSet.has(a.id) ? 0 : 1
      const bSel = selectedSet.has(b.id) ? 0 : 1
      if (aSel !== bSel) return aSel - bSel
      return a.name.localeCompare(b.name)
    })
  }, [allConcepts, relatedIds, relatedSearch])

  function addGotcha() {
    setGotchas((prev) => [...prev, ''])
  }
  function removeGotcha(i: number) {
    setGotchas((prev) => prev.filter((_, j) => j !== i))
  }
  function updateGotcha(i: number, v: string) {
    setGotchas((prev) => prev.map((g, j) => (j === i ? v : g)))
  }
  function toggleRelated(id: string) {
    setRelatedIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    )
  }

  async function handleSave() {
    setErr(null)
    if (!conceptId) {
      setErr('Pick a concept first.')
      return
    }
    if (title.trim().length < 1 || title.trim().length > 200) {
      setErr('Title must be 1–200 characters.')
      return
    }
    if (bodyMd.length < 50 || bodyMd.length > 10000) {
      setErr('Body must be 50–10,000 characters.')
      return
    }
    const cleanGotchas = gotchas.map((g) => g.trim()).filter((g) => g.length > 0)
    const cleanDiagram = diagramUrl.trim()
    if (cleanDiagram && !/^https?:\/\//.test(cleanDiagram)) {
      setErr('Diagram URL must start with http(s)://')
      return
    }

    const payload = {
      title: title.trim(),
      bodyMd,
      gotchas: cleanGotchas.length > 0 ? cleanGotchas : null,
      relatedConceptIds: relatedIds.length > 0 ? relatedIds : null,
      diagramUrl: cleanDiagram.length > 0 ? cleanDiagram : null,
    }

    setSubmitting(true)
    try {
      const url =
        mode === 'new'
          ? '/api/admin/briefs'
          : `/api/admin/briefs/${conceptId}`
      const method = mode === 'new' ? 'POST' : 'PATCH'
      const body = mode === 'new' ? { ...payload, conceptId } : payload
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        if (res.status === 409 && j.error === 'brief_already_exists') {
          setErr('A brief already exists for that concept. Edit it instead.')
        } else {
          setErr(j.error ? `Save failed: ${j.error}` : `Save failed (HTTP ${res.status}).`)
        }
        setSubmitting(false)
        return
      }
      router.push('/admin/briefs')
      router.refresh()
    } catch (e) {
      console.error('BriefEditor save network error', e)
      setErr('Network error. Try again.')
      setSubmitting(false)
    }
  }

  const headerLabel =
    mode === 'edit'
      ? `Editing brief — ${conceptName ?? conceptId}`
      : 'New concept brief'

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-1">{headerLabel}</h1>
      <p className="text-sm text-v2-foreground-subtle mb-6">
        Markdown supported in body. Saved briefs are served before the first
        question of a concept the user has never seen.
      </p>

      {err && (
        <div className="mb-4 rounded-lg border border-v2-error/30 bg-v2-error-soft px-3 py-2 text-[13px] text-v2-error">
          {err}
        </div>
      )}

      {mode === 'new' && (
        <div className="mb-5">
          <label className="text-xs font-semibold text-v2-foreground-muted">
            Concept
          </label>
          <select
            value={conceptId ?? ''}
            onChange={(e) => setConceptId(e.target.value || null)}
            disabled={submitting}
            className="mt-1 w-full rounded-lg border border-v2-border bg-v2-surface-subtle px-3 py-2 text-sm"
          >
            <option value="">Pick a concept…</option>
            {(availableConcepts ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {(availableConcepts?.length ?? 0) === 0 && (
            <p className="mt-1 text-xs text-v2-foreground-subtle">
              All concepts already have a brief. Edit an existing one from the list.
            </p>
          )}
        </div>
      )}

      <div className="mb-5">
        <label className="text-xs font-semibold text-v2-foreground-muted">
          Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={submitting}
          maxLength={200}
          className="mt-1 w-full rounded-lg border border-v2-border bg-v2-surface-subtle px-3 py-2 text-sm"
          placeholder="e.g. S3 Storage Classes — when to use which"
        />
        <p className="mt-1 text-[11px] text-v2-foreground-subtle">
          {title.length}/200
        </p>
      </div>

      <div className="mb-5">
        <label className="text-xs font-semibold text-v2-foreground-muted">
          Body (markdown)
        </label>
        <textarea
          value={bodyMd}
          onChange={(e) => setBodyMd(e.target.value)}
          disabled={submitting}
          rows={30}
          maxLength={10000}
          className="mt-1 w-full rounded-lg border border-v2-border bg-v2-surface-subtle px-3 py-2 font-mono text-[13px] leading-relaxed"
          placeholder={"## Overview\n\nShort prose, 300–500 words. Bullet lists and code spans are fine.\n"}
        />
        <p className="mt-1 text-[11px] text-v2-foreground-subtle">
          {bodyMd.length}/10,000 (min 50)
        </p>
      </div>

      <div className="mb-5">
        <label className="text-xs font-semibold text-v2-foreground-muted">
          Gotchas
        </label>
        <p className="mt-0.5 mb-2 text-[11px] text-v2-foreground-subtle">
          Short bullet-style &ldquo;watch out for&hellip;&rdquo; callouts. Empty entries are dropped on save.
        </p>
        <div className="space-y-2">
          {gotchas.map((g, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={g}
                onChange={(e) => updateGotcha(i, e.target.value)}
                disabled={submitting}
                className="flex-1 rounded-lg border border-v2-border bg-v2-surface-subtle px-3 py-1.5 text-sm"
                placeholder="e.g. Glacier retrievals can take minutes to hours."
              />
              <button
                type="button"
                onClick={() => removeGotcha(i)}
                disabled={submitting}
                className="rounded-md p-1.5 text-v2-foreground-muted transition-colors hover:bg-v2-surface-subtle hover:text-v2-error"
                aria-label="Remove gotcha"
              >
                <X className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addGotcha}
          disabled={submitting}
          className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-v2-brand hover:text-v2-brand-hover"
        >
          <Plus className="h-3 w-3" strokeWidth={2.25} />
          Add gotcha
        </button>
      </div>

      <div className="mb-5">
        <label className="text-xs font-semibold text-v2-foreground-muted">
          Diagram URL (optional)
        </label>
        <input
          value={diagramUrl}
          onChange={(e) => setDiagramUrl(e.target.value)}
          disabled={submitting}
          placeholder="https://… (typically Supabase Storage)"
          className="mt-1 w-full rounded-lg border border-v2-border bg-v2-surface-subtle px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-6">
        <label className="text-xs font-semibold text-v2-foreground-muted">
          Related concepts ({relatedIds.length} selected)
        </label>
        <input
          value={relatedSearch}
          onChange={(e) => setRelatedSearch(e.target.value)}
          disabled={submitting}
          placeholder="Search by name or slug…"
          className="mt-1 mb-2 w-full rounded-lg border border-v2-border bg-v2-surface-subtle px-3 py-1.5 text-sm"
        />
        <div className="max-h-[300px] overflow-y-auto rounded-lg border border-v2-border bg-v2-surface-subtle">
          {filteredRelated.length === 0 && (
            <div className="p-4 text-center text-[12px] text-v2-foreground-subtle">
              No concepts match.
            </div>
          )}
          {filteredRelated.map((c) => {
            const checked = relatedIds.includes(c.id)
            const isSelf = c.id === conceptId
            return (
              <label
                key={c.id}
                className={cn(
                  'flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-v2-surface',
                  isSelf && 'opacity-40 cursor-not-allowed',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={submitting || isSelf}
                  onChange={() => toggleRelated(c.id)}
                />
                <span className="flex-1">
                  {c.name}{' '}
                  <span className="font-mono text-[11px] text-v2-foreground-subtle">
                    {c.slug}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={submitting || !conceptId}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-v2-gradient-brand px-5 text-[13px] font-semibold text-white shadow-v2-button transition-all hover:-translate-y-0.5 disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} />}
          Save
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/briefs')}
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-v2-border bg-v2-surface px-4 text-[13px] font-semibold text-v2-foreground transition-colors hover:bg-v2-surface-subtle disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
