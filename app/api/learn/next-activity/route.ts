export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { nextActivity } from '@/lib/learning-engine/orchestrator'

export async function GET() {
  const user = await requireAuthenticatedUser()
  const activity = await nextActivity(user.id)
  return NextResponse.json({ data: activity })
}
