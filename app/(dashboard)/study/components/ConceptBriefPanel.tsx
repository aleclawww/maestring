'use client'

import { useEffect, useState } from 'react'
import { Loader2, AlertCircle, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Card } from '@/components/v2'
import { cn } from '@/lib/utils'

interface ConceptBriefPanelProps {
  conceptId: string
  onDismiss: (briefLoaded: boolean) => void
}

interface BriefData {
  conceptId: string
  title: string
  bodyMd: string
  gotchas: string[] | null
  relatedConceptIds: string[] | null
  diagramUrl: string | null
  updatedAt: string
}

type FetchState =
  | { status: 'loading' }
  | { status: 'ok'; data: BriefData }
  | { status: 'not_found' }
  | { status: 'error' }

export function ConceptBriefPanel({
  conceptId,
  onDismiss,
}: ConceptBriefPanelProps) {
  const [state, setState] = useState<FetchState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    fetch(`/api/concepts/${conceptId}/brief`)
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 404) {
          setState({ status: 'not_found' })
          return
        }
        if (!res.ok) {
          setState({ status: 'error' })
          return
        }
        const data = (await res.json()) as BriefData
        if (!cancelled) setState({ status: 'ok', data })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [conceptId])

  // Continue button is ALWAYS rendered: the panel must never block the user
  // from proceeding to the question, regardless of brief availability or
  // fetch outcome.
  const continueButton = (
    <button
      onClick={() => onDismiss(state.status === 'ok')}
      className={cn(
        'inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-v2-gradient-brand px-5 text-[14px] font-semibold text-white shadow-v2-button transition-all duration-200 ease-v2',
        'hover:-translate-y-0.5 hover:shadow-v2-elevated',
      )}
    >
      <Sparkles className="h-4 w-4" strokeWidth={2.25} />
      {state.status === 'ok' ? 'Got it, quiz me' : 'Continue to question'}
    </button>
  )

  if (state.status === 'loading') {
    return (
      <Card padding="none" className="overflow-hidden">
        <div className="flex items-center justify-center px-6 py-12">
          <Loader2
            className="h-5 w-5 animate-spin text-v2-foreground-muted"
            strokeWidth={2.25}
          />
          <span className="ml-2 text-[13px] text-v2-foreground-muted">
            Loading brief…
          </span>
        </div>
      </Card>
    )
  }

  if (state.status === 'not_found') {
    return (
      <Card padding="none" className="overflow-hidden">
        <div className="px-6 py-8 text-center">
          <p className="text-[14px] text-v2-foreground-muted">
            No brief available yet for this concept.
          </p>
          <div className="mt-5 flex justify-center">{continueButton}</div>
        </div>
      </Card>
    )
  }

  if (state.status === 'error') {
    return (
      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-col items-center px-6 py-8 text-center">
          <AlertCircle
            className="h-5 w-5 text-v2-warning"
            strokeWidth={2.25}
          />
          <p className="mt-2 text-[14px] text-v2-foreground-muted">
            Could not load the brief. You can continue to the question.
          </p>
          <div className="mt-5">{continueButton}</div>
        </div>
      </Card>
    )
  }

  const { data } = state
  const hasGotchas = Array.isArray(data.gotchas) && data.gotchas.length > 0

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="border-b border-v2-border-subtle px-6 py-4">
        <span className="font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-foreground-subtle">
          Concept brief
        </span>
        <h2 className="mt-1 text-[18px] font-semibold leading-tight text-v2-foreground">
          {data.title}
        </h2>
      </div>

      <div className="px-6 py-6">
        <div className="prose prose-sm prose-slate max-w-none">
          <ReactMarkdown>{data.bodyMd}</ReactMarkdown>
        </div>

        {hasGotchas && (
          <div className="mt-6 rounded-lg border-l-[3px] border-l-v2-warning bg-v2-warning-soft/60 px-4 py-3">
            <p className="font-v2-mono text-[10px] font-semibold uppercase tracking-v2-wide text-v2-warning">
              Watch out for
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-[1.55] text-v2-foreground">
              {data.gotchas!.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>
        )}

        {data.diagramUrl && (
          <div className="mt-6 overflow-hidden rounded-lg border border-v2-border bg-v2-surface-subtle">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.diagramUrl}
              alt={`Diagram for ${data.title}`}
              className="block h-auto w-full"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end border-t border-v2-border-subtle px-6 py-4">
        {continueButton}
      </div>
    </Card>
  )
}
