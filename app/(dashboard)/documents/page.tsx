import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Documents — coming with new exams' }

/**
 * PDF upload is on hold for SAA-C03 — the full 142-concept syllabus is
 * already baked in, so there's no need for users to upload their own
 * notes. The feature comes back when we add other certifications where
 * users may want to ingest custom material (e.g. niche/internal
 * compliance courses).
 *
 * The original implementation is preserved in git history. To re-enable:
 *   1. Restore the previous components/page from git history
 *   2. Add OPENAI_API_KEY to Vercel env
 *   3. Restore the Sidebar.tsx Documents nav entry
 */
export default function DocumentsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <div className="text-5xl mb-2">📄</div>
          <h1 className="text-2xl font-bold">PDF upload is on hold for SAA-C03</h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            The full 142-concept SAA-C03 syllabus is already in the platform —
            there&rsquo;s nothing meaningful to add by uploading your own PDFs.
            We&rsquo;ll bring this feature back when we expand to certifications
            where users want to ingest custom material (compliance courses,
            internal training, etc.).
          </p>
          <div className="flex gap-2 justify-center pt-2 flex-wrap">
            <Link href="/learn" className="btn-primary text-sm px-4 py-2 rounded-lg">
              📚 Browse the SAA-C03 syllabus
            </Link>
            <Link href="/learn/session" className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-surface-2">
              🧭 Open Coach
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
