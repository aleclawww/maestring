import Link from 'next/link'
import { ArrowRight, FileText, Sparkles } from 'lucide-react'
import { Card, Eyebrow, Pill } from '@/components/v2'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Documents — coming with new exams' }

/**
 * PDF upload is on hold for SAA-C03 — the full 142-concept syllabus is
 * already baked in, so there's no need for users to upload their own
 * notes. The feature comes back when we add other certifications where
 * users may want to ingest custom material (compliance courses, internal
 * training, etc.). Original implementation preserved in git history.
 */
export default function DocumentsPage() {
  return (
    <div className="mx-auto max-w-[640px]">
      <Card padding="lg" className="text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-v2-brand-soft text-v2-brand">
          <FileText className="h-6 w-6" strokeWidth={2} />
        </div>
        <Pill tone="neutral" size="md" className="mx-auto mt-5">
          <span className="font-v2-mono text-[10px] uppercase tracking-v2-wide">
            On hold
          </span>
        </Pill>
        <h1 className="v2-display mt-4 text-[24px] sm:text-[28px]">
          PDF upload pauses for SAA-C03
        </h1>
        <p className="mx-auto mt-3 max-w-[480px] text-[14px] leading-[1.65] text-v2-foreground-muted">
          The full 142-concept SAA-C03 syllabus is already in the platform —
          there's nothing meaningful to add by uploading your own PDFs. We'll
          bring this feature back when we expand to certifications where users
          want to ingest custom material (compliance courses, internal
          training, etc.).
        </p>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/learn"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-v2-gradient-brand px-4 text-[13px] font-semibold text-white shadow-v2-button transition-all hover:-translate-y-0.5 hover:shadow-v2-elevated"
          >
            Browse the SAA-C03 syllabus
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </Link>
          <Link
            href="/learn/session"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-v2-border bg-v2-surface px-4 text-[13px] font-semibold text-v2-foreground transition-colors hover:bg-v2-surface-subtle"
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} />
            Open Coach
          </Link>
        </div>
      </Card>
    </div>
  )
}
