import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
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

const TONE_CLASSES: Record<NextAction['tone'], string> = {
  primary: 'border-primary/40 bg-primary/5',
  warning: 'border-warning/40 bg-warning/5',
  success: 'border-success/40 bg-success/5',
  info:    'border-blue-500/40 bg-blue-500/5',
}

export function WhatsNext({ actions }: { actions: NextAction[] }) {
  if (actions.length === 0) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-text-secondary">
          You&rsquo;re all caught up. Next review opens automatically when concepts come due.
        </CardContent>
      </Card>
    )
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {actions.map(a => (
        <Link key={a.id} href={a.href}>
          <Card hover className={`h-full ${TONE_CLASSES[a.tone]}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="text-2xl">{a.icon}</div>
                <span className="text-xs text-primary font-semibold">{a.cta} →</span>
              </div>
              <h3 className="font-semibold text-sm">{a.title}</h3>
              <p className="text-xs text-text-secondary mt-1.5">{a.reason}</p>
            </CardContent>
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
  ambientNeeded?: number          // count remaining for phase advance
  totalConcepts: number
  notSeenCount: number
}): NextAction[] {
  const out: NextAction[] = []

  if (!input.hasCalibration) {
    out.push({
      id: 'calibrate',
      icon: '🧪',
      title: 'Run calibration',
      reason: '5 minutes — measures memory, speed and best study window. Required before the Coach can recommend anything.',
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
      reason: 'These are the highest-leverage minutes today — FSRS scheduled them right at the forgetting curve.',
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
      reason: 'Passive exposure builds the familiarity scaffolding. Quick reads, no testing.',
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
      reason: 'Domain decay is the leading cause of late-session surprises. A short refresher resets the timer.',
      href: '/learn',
      cta: 'Refresh',
      tone: 'warning',
    })
  }

  if (input.notSeenCount > 0 && input.dueCount === 0) {
    const pct = Math.round(((input.totalConcepts - input.notSeenCount) / input.totalConcepts) * 100)
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
      reason: 'The Coach picks the right activity for this phase — phase-aware orchestration.',
      href: '/learn/session',
      cta: 'Go to Coach',
      tone: 'info',
    })
  }

  return out
}
