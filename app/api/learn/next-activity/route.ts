export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { nextActivity } from '@/lib/learning-engine/orchestrator'
import { getEntitlement } from '@/lib/subscription/check'

export async function GET() {
  const user = await requireAuthenticatedUser()

  // Same engagement gate as /api/study/generate. Lets the user complete
  // calibration + a few activities before being asked for the card.
  const ent = await getEntitlement(user.id)
  if (ent.kind === 'gated') {
    return NextResponse.json(
      { error: 'preview_exhausted', message: 'Free preview used. Start your 7-day trial to keep going.', paywall: true },
      { status: 402 }
    )
  }

  const activity = await nextActivity(user.id)
  return NextResponse.json({ data: activity })
}
