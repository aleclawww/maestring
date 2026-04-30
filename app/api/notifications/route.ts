export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export type NotificationItem = {
  id: string
  type: 'review' | 'warning' | 'info' | 'success'
  message: string
  href: string
  icon: string
}

export async function GET() {
  const user = await requireAuthenticatedUser()
  const supabase = createClient()

  const [profileRes, statesRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('current_streak, exam_target_date')
      .eq('id', user.id)
      .single(),
    supabase
      .from('user_concept_states')
      .select('next_review_date, reps, stability')
      .eq('user_id', user.id),
  ])

  const now = new Date()
  const profile = profileRes.data
  const states = statesRes.data ?? []

  // Count concepts due for review right now
  const dueCount = states.filter(
    s => s.reps === 0 || !s.next_review_date || new Date(s.next_review_date) <= now
  ).length

  // Count concepts with fragile retention due within 7 days
  const atRiskCount = states.filter(
    s =>
      s.next_review_date &&
      new Date(s.next_review_date) <= new Date(Date.now() + 7 * 86_400_000) &&
      (s.stability ?? 99) < 14
  ).length

  const daysToExam = profile?.exam_target_date
    ? Math.ceil((new Date(profile.exam_target_date).getTime() - now.getTime()) / 86_400_000)
    : null

  const items: NotificationItem[] = []

  if (dueCount > 0) {
    items.push({
      id: 'due',
      type: 'review',
      message: `${dueCount} concept${dueCount !== 1 ? 's' : ''} ready to review`,
      href: '/study',
      icon: '🔄',
    })
  }

  if (atRiskCount > 0) {
    items.push({
      id: 'at-risk',
      type: 'warning',
      message: `${atRiskCount} concept${atRiskCount !== 1 ? 's' : ''} at risk of forgetting`,
      href: '/study',
      icon: '⚠️',
    })
  }

  if (daysToExam !== null && daysToExam > 0 && daysToExam <= 30) {
    items.push({
      id: 'exam-soon',
      type: 'info',
      message: `Exam in ${daysToExam} day${daysToExam !== 1 ? 's' : ''} — stay focused!`,
      href: '/exam',
      icon: '📅',
    })
  } else if (daysToExam !== null && daysToExam <= 0) {
    items.push({
      id: 'exam-past',
      type: 'info',
      message: "How did your exam go? Let us know!",
      href: '/dashboard',
      icon: '🎯',
    })
  }

  if ((profile?.current_streak ?? 0) >= 3) {
    items.push({
      id: 'streak',
      type: 'success',
      message: `${profile!.current_streak}-day streak — keep it going!`,
      href: '/progress',
      icon: '🔥',
    })
  }

  // "Unread" count = actionable items (not just positive/informational streaks)
  const unread = items.filter(i => i.type !== 'success').length

  return NextResponse.json({ data: { items, unread } })
}
