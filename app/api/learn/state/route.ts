export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { THRESHOLDS } from '@/lib/learning-engine/transitions'

/**
 * Returns the user's learning_state row plus the per-phase progress
 * percentage for the SessionRouter progress bar.
 */
export async function GET() {
  const user = await requireAuthenticatedUser()
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.rpc as any)('ensure_user_learning_state', { p_user_id: user.id })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: state } = await (supabase
    .from('user_learning_state')
    .select('*' as any) as any)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!state) return NextResponse.json({ data: null })

  const progress = computeProgress(state)
  return NextResponse.json({ data: { state, progress } })
}

function ratio(num: number, den: number): { num: number; den: number; pct: number } {
  return { num, den, pct: den === 0 ? 0 : Math.min(100, Math.round((num / den) * 100)) }
}

function computeProgress(s: Record<string, number | string | null>) {
  switch (s.phase as string) {
    case 'calibration':
      return { label: 'Awaiting calibration', ...ratio(0, 1) }
    case 'ambient':
      return { label: 'Ambient exposures', ...ratio((s.ambient_exposures as number) ?? 0, THRESHOLDS.ambient.minExposures) }
    case 'anchoring':
      return { label: 'Open-ended responses', ...ratio((s.anchoring_responses as number) ?? 0, THRESHOLDS.anchoring.minResponses) }
    case 'retrieval_easy':
      return { label: 'Retrieval attempts', ...ratio((s.retrieval_attempts as number) ?? 0, THRESHOLDS.retrieval_easy.minAttempts) }
    case 'interleaving':
      return { label: 'Interleaved attempts', ...ratio((s.interleave_attempts as number) ?? 0, THRESHOLDS.interleaving.minAttempts) }
    case 'consolidation':
      return { label: 'Consolidating', ...ratio(1, 2) /* time-based; show 50% */ }
    case 'automation':
      return { label: 'Drills under 8s', ...ratio((s.automation_under8s as number) ?? 0, Math.ceil(THRESHOLDS.automation.minAttempts * THRESHOLDS.automation.minUnder8sRatio)) }
    case 'transfer':
      return { label: 'Transfer scenarios', ...ratio((s.transfer_attempts as number) ?? 0, THRESHOLDS.transfer.minAttempts) }
    case 'mastery':
      return { label: 'Maintenance', ...ratio(1, 1) }
    default:
      return { label: '—', ...ratio(0, 1) }
  }
}
