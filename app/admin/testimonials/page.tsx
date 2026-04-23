import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { TestimonialsAdminClient } from './client'

export const dynamic = 'force-dynamic'

type Row = {
  id: string
  user_id: string | null
  user_email: string | null
  display_name: string
  role: string | null
  content: string
  stars: number
  status: 'pending' | 'approved' | 'rejected'
  featured: boolean
  submitted_at: string
  reviewed_at: string | null
  exam_passed: boolean | null
  scaled_score: number | null
}

export default async function AdminTestimonialsPage() {
  await requireAdmin()
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.rpc as any)('admin_list_testimonials', { p_limit: 200 })
  const rows = (data ?? []) as Row[]

  const counts = {
    pending: rows.filter((r) => r.status === 'pending').length,
    approved: rows.filter((r) => r.status === 'approved').length,
    rejected: rows.filter((r) => r.status === 'rejected').length,
  }

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold mb-2">Testimonials</h1>
      <p className="text-sm text-text-muted mb-6">
        Aprueba manualmente cada testimonio antes de que aparezca en la landing.
        Publica solo cuotas reales y verificadas (compliance FTC).
      </p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
          <p className="text-xs text-warning uppercase tracking-wide">Pendientes</p>
          <p className="text-2xl font-bold text-warning">{counts.pending}</p>
        </div>
        <div className="rounded-xl border border-success/30 bg-success/10 p-4">
          <p className="text-xs text-success uppercase tracking-wide">Aprobados</p>
          <p className="text-2xl font-bold text-success">{counts.approved}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted uppercase tracking-wide">Rechazados</p>
          <p className="text-2xl font-bold text-text-primary">{counts.rejected}</p>
        </div>
      </div>

      <TestimonialsAdminClient rows={rows} />
    </div>
  )
}
