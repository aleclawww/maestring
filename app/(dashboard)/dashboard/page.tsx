import { requireAuthenticatedUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'
import { ReadinessCard, type ReadinessData } from '@/components/dashboard/ReadinessCard'
import { OutcomeCaptureBanner } from '@/components/dashboard/OutcomeCaptureBanner'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser()
  const supabase = createClient()

  const [
    { data: profile },
    { data: stats },
    { data: recentSessions },
    { data: domainStates },
    { data: readinessRows },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, current_streak, total_xp, exam_target_date, onboarding_completed, exam_outcome')
      .eq('id', user.id)
      .single(),
    supabase.rpc('get_user_stats', { p_user_id: user.id }),
    supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_completed', true)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('user_concept_states')
      .select('state, reps, lapses, concept_id, next_review_date')
      .eq('user_id', user.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.rpc('get_exam_readiness_v2' as any, { p_user_id: user.id }),
  ])

  const readiness = (readinessRows as ReadinessData[] | null)?.[0] ?? null

  const statsRow = stats?.[0]
  const dueCount =
    (domainStates ?? []).filter(
      s => s.reps === 0 || !s.next_review_date || new Date(s.next_review_date) <= new Date()
    ).length

  const daysToExam = profile?.exam_target_date
    ? Math.ceil(
        (new Date(profile.exam_target_date).getTime() - Date.now()) / 86400000
      )
    : null

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Estudiante'

  // Pilar 7 — outcome capture: fecha de examen pasó y todavía no sabemos cómo
  // fue. Mostrar el banner por encima de todo (la decisión de hoy es esa).
  const examOutcome = (profile as { exam_outcome?: string | null } | null)?.exam_outcome ?? null
  const needsOutcome =
    !!profile?.exam_target_date &&
    new Date(profile.exam_target_date).getTime() <= Date.now() &&
    Date.now() - new Date(profile.exam_target_date).getTime() <= 60 * 86400000 &&
    (examOutcome === null || examOutcome === 'unknown')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Hola, {firstName} 👋
        </h1>
        <p className="text-text-secondary mt-1">
          {daysToExam !== null && daysToExam > 0
            ? `${daysToExam} días para tu examen. ¡Vamos con todo!`
            : 'Continúa tu preparación para AWS SAA-C03.'}
        </p>
      </div>

      {/* Pilar 7: outcome capture (gana prioridad sobre readiness) */}
      {needsOutcome && profile?.exam_target_date && (
        <OutcomeCaptureBanner examDate={profile.exam_target_date} />
      )}

      {/* Pilar 1: Readiness Score */}
      {readiness && !needsOutcome && <ReadinessCard data={readiness} />}

      {/* Action Card */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-transparent">
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-muted mb-1">
              {dueCount > 0 ? `${dueCount} conceptos listos para repasar` : 'No hay repasos pendientes'}
            </p>
            <h2 className="text-lg font-bold text-text-primary">
              {dueCount > 0 ? '¿Listo para estudiar?' : '¡Al día con tus repasos!'}
            </h2>
          </div>
          <Link
            href="/study"
            className="btn-primary"
          >
            {dueCount > 0 ? `Estudiar (${dueCount})` : 'Explorar más'}
          </Link>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: 'Racha actual',
            value: `${profile?.current_streak ?? 0} días`,
            icon: '🔥',
            color: 'text-warning',
          },
          {
            label: 'XP Total',
            value: (profile?.total_xp ?? 0).toLocaleString(),
            icon: '⭐',
            color: 'text-primary',
          },
          {
            label: 'Precisión',
            value: `${Math.round((statsRow?.avg_accuracy ?? 0) * 100)}%`,
            icon: '🎯',
            color: 'text-success',
          },
          {
            label: 'Conceptos dominados',
            value: (statsRow?.concepts_mastered ?? 0).toString(),
            icon: '🏆',
            color: 'text-success',
          },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{stat.icon}</span>
                <span className={`text-xl font-bold ${stat.color}`}>{stat.value}</span>
              </div>
              <p className="text-xs text-text-muted">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Sessions */}
      {recentSessions && recentSessions.length > 0 && (
        <Card>
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold text-text-primary">Sesiones recientes</h2>
            <Link href="/progress" className="text-xs text-primary hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentSessions.map(session => {
              const accuracy =
                session.concepts_studied > 0
                  ? Math.round((session.correct_count / session.concepts_studied) * 100)
                  : 0
              return (
                <div key={session.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary capitalize">
                      {session.mode === 'discovery'
                        ? 'Descubrimiento'
                        : session.mode === 'review'
                        ? 'Repaso'
                        : session.mode === 'intensive'
                        ? 'Intensivo'
                        : 'Mantenimiento'}
                    </p>
                    <p className="text-xs text-text-muted">
                      {formatRelativeTime(session.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={accuracy >= 80 ? 'success' : accuracy >= 60 ? 'warning' : 'danger'}>
                      {accuracy}%
                    </Badge>
                    <span className="text-xs text-text-muted">
                      {session.concepts_studied} preguntas
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { href: '/study', label: 'Sesión rápida', desc: 'Repasa conceptos vencidos', icon: '⚡' },
          { href: '/exam', label: 'Simulacro', desc: '65 preguntas, 130 min', icon: '📝' },
          { href: '/documents', label: 'Subir PDF', desc: 'Convierte tus notas en preguntas', icon: '📤' },
        ].map(action => (
          <Link key={action.href} href={action.href}>
            <Card hover className="h-full">
              <CardContent className="pt-4">
                <span className="text-2xl">{action.icon}</span>
                <p className="mt-2 text-sm font-semibold text-text-primary">{action.label}</p>
                <p className="text-xs text-text-muted">{action.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
