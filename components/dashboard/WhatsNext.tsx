import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card } from '@/components/v2'
import { PHASE_LABEL, type Phase } from '@/lib/learning-engine/types'

export interface NextAction {
  id: string
  icon: string
  title: string
  reason: string
  href: string
  cta: string
  tone: 'primary' | 'warning' | 'success' | 'info'
}

const TONE_BORDER: Record<NextAction['tone'], string> = {
  primary: 'border-l-v2-brand',
  warning: 'border-l-v2-warning',
  success: 'border-l-v2-success',
  info: 'border-l-sky-500',
}

const TONE_CTA: Record<NextAction['tone'], string> = {
  primary: 'text-v2-brand',
  warning: 'text-v2-warning',
  success: 'text-v2-success',
  info: 'text-sky-700',
}

export function WhatsNext({ actions }: { actions: NextAction[] }) {
  if (actions.length === 0) {
    return (
      <Card padding="md">
        <p className="text-[14px] leading-[1.55] text-v2-foreground-muted">
          You're all caught up. Next review opens automatically when concepts
          come due.
        </p>
      </Card>
    )
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {actions.map((a) => (
        <Link key={a.id} href={a.href} className="group block">
          <Card
            interactive
            className={`h-full border-l-[3px] ${TONE_BORDER[a.tone]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-2xl" aria-hidden>
                {a.icon}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[12px] font-semibold ${TONE_CTA[a.tone]}`}
              >
                {a.cta}
                <ArrowRight
                  className="h-3 w-3 transition-transform duration-200 ease-v2 group-hover:translate-x-0.5"
                  strokeWidth={2.5}
                />
              </span>
            </div>
            <h3 className="mt-3 text-[14px] font-bold text-v2-foreground">
              {a.title}
            </h3>
            <p className="mt-1.5 text-[12px] leading-[1.55] text-v2-foreground-muted">
              {a.reason}
            </p>
          </Card>
        </Link>
      ))}
    </div>
  )
}

/**
 * Build prioritised actions from the user's current state.
 * Ordered by importance — caller will typically slice to the top 3-4.
 */
export function buildNextActions(input: {
  hasCalibration: boolean
  phase: Phase | null
  dueCount: number
  staleDomain?: { name: string; daysSince: number } | null
  ambientNeeded?: number
  totalConcepts: number
  notSeenCount: number
}): NextAction[] {
  const out: NextAction[] = []

  if (!input.hasCalibration) {
    out.push({
      id: 'calibrate',
      icon: '🧪',
      title: 'Run calibration',
      reason:
        '5 minutes — measures memory, speed and best study window. Required before the Coach can recommend anything.',
      href: '/learn/calibration',
      cta: 'Start',
      tone: 'primary',
    })
    return out
  }

  if (input.dueCount > 0) {
    out.push({
      id: 'due',
      icon: '🔥',
      title: `${input.dueCount} concept${input.dueCount === 1 ? '' : 's'} due for review`,
      reason:
        'These are the highest-leverage minutes today — FSRS scheduled them right at the forgetting curve.',
      href: '/study',
      cta: 'Review',
      tone: 'primary',
    })
  }

  if (input.ambientNeeded != null && input.ambientNeeded > 0) {
    out.push({
      id: 'ambient',
      icon: '🎯',
      title: `${input.ambientNeeded} ambient cards to unlock the next phase`,
      reason:
        'Passive exposure builds the familiarity scaffolding. Quick reads, no testing.',
      href: '/learn/session',
      cta: 'Continue',
      tone: 'info',
    })
  }

  if (input.staleDomain && input.staleDomain.daysSince >= 5) {
    out.push({
      id: 'stale',
      icon: '⚠️',
      title: `${input.staleDomain.name} hasn't been touched in ${input.staleDomain.daysSince} days`,
      reason:
        'Domain decay is the leading cause of late-session surprises. A short refresher resets the timer.',
      href: '/learn',
      cta: 'Refresh',
      tone: 'warning',
    })
  }

  if (input.notSeenCount > 0 && input.dueCount === 0) {
    const pct = Math.round(
      ((input.totalConcepts - input.notSeenCount) / input.totalConcepts) * 100,
    )
    out.push({
      id: 'discover',
      icon: '🌱',
      title: `${input.notSeenCount} concepts not yet seen`,
      reason: `You've touched ${pct}% of the syllabus. Discover mode picks fresh ones.`,
      href: '/study',
      cta: 'Discover',
      tone: 'success',
    })
  }

  if (input.phase && input.phase !== 'calibration') {
    out.push({
      id: 'coach',
      icon: '🧭',
      title: `You're in ${PHASE_LABEL[input.phase]}`,
      reason:
        'The Coach picks the right activity for this phase — phase-aware orchestration.',
      href: '/learn/session',
      cta: 'Go to Coach',
      tone: 'info',
    })
  }

  return out
}
