import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cn } from '@/lib/utils'

const PASSING_SCORE = 720
const MAX_SCORE = 1000

interface DomainRow {
  slug: string
  name: string
  weight: number
  total: number
  correct: number
  accuracy: number
}

export default async function ExamResultsPage({ params }: { params: { id: string } }) {
  const user = await requireAuthenticatedUser()
  const supabase = createAdminClient()

  const { data: session } = await supabase
    .from('exam_sessions')
    .select('id, user_id, status, total_questions, correct_count, scaled_score, passed, by_domain, started_at, submitted_at')
    .eq('id', params.id)
    .single()

  if (!session || session.user_id !== user.id) notFound()
  if (session.status === 'in_progress') redirect(`/exam/${params.id}`)

  const scaled = session.scaled_score ?? 0
  const passed = !!session.passed
  const correct = session.correct_count ?? 0
  const total = session.total_questions ?? 0
  const accuracy = total > 0 ? correct / total : 0
  const byDomain = (session.by_domain as DomainRow[] | null) ?? []

  const circumference = 2 * Math.PI * 42
  const offset = circumference * (1 - scaled / MAX_SCORE)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          {passed ? '🎉 Passed!' : '📚 Keep practicing'}
        </h1>
        <p className="text-text-secondary">
          {passed
            ? "You've cleared the passing threshold. Great work!"
            : "You didn't reach the minimum this time. Keep studying!"}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-8 mb-8">
        <div className="relative w-44 h-44">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#1e2535" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={passed ? '#10b981' : '#ef4444'}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-text-primary">{scaled}</span>
            <span className="text-xs text-text-muted">/ {MAX_SCORE}</span>
            <span className={cn('text-xs font-bold mt-1', passed ? 'text-success' : 'text-danger')}>
              {passed ? 'PASSED' : 'FAILED'}
            </span>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-surface p-3 text-center">
            <p className="text-2xl font-bold text-success">{correct}</p>
            <p className="text-xs text-text-muted">Correct</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3 text-center">
            <p className="text-2xl font-bold text-danger">{total - correct}</p>
            <p className="text-xs text-text-muted">Incorrect</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3 text-center">
            <p className="text-2xl font-bold text-text-primary">{Math.round(accuracy * 100)}%</p>
            <p className="text-xs text-text-muted">Accuracy</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3 text-center">
            <p className={cn('text-2xl font-bold', passed ? 'text-success' : 'text-warning')}>
              {PASSING_SCORE}
            </p>
            <p className="text-xs text-text-muted">Passing threshold</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 mb-6">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Results by domain</h2>
        <div className="space-y-3">
          {byDomain.length === 0 && (
            <p className="text-xs text-text-muted">No data by domain.</p>
          )}
          {byDomain.map((d) => {
            const pct = Math.round(d.accuracy * 100)
            const ok = pct >= 72
            return (
              <div key={d.slug}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-secondary">
                    {d.name} <span className="text-text-muted">· weight {d.weight}%</span>
                  </span>
                  <span className={ok ? 'text-success' : 'text-danger'}>
                    {pct}% ({d.correct}/{d.total})
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', ok ? 'bg-success' : 'bg-danger')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/exam" className="btn-outline flex-1 text-center">
          New mock exam
        </Link>
        <Link href="/study" className="btn-primary flex-1 text-center">
          Keep studying
        </Link>
      </div>
    </div>
  )
}
