import { createAdminClient } from '@/lib/supabase/admin'

// Small typed wrappers for admin RPCs. Centralized so page files stay clean
// and we have one spot to add error logging.
export type AdminOverview = {
  users_total: number
  users_onboarded: number
  mau: number
  dau: number
  new_signups_7d: number
  subs_active: number
  subs_by_plan: Record<string, number>
  mrr_usd_cents: number
  llm_spend_today_usd: number
  llm_spend_7d_usd: number
  llm_spend_30d_usd: number
  llm_calls_today: number
  llm_error_rate_24h: number
  sessions_7d: number
  sessions_completed_7d: number
  outcomes_passed: number
  outcomes_failed: number
  outcomes_pending: number
  docs_failed_7d: number
  docs_processing: number
  pool_size: number
  pool_coverage: number
}

export type AdminUserRow = {
  id: string
  email: string
  full_name: string | null
  plan: string
  onboarding_completed: boolean
  journey_phase: string
  current_streak: number
  total_xp: number
  exam_target_date: string | null
  exam_outcome: string | null
  last_readiness_score: number | null
  last_session_at: string | null
  llm_spend_30d: number
  created_at: string
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc('admin_overview' as any)
  if (error) throw error
  return data as AdminOverview
}

export async function listAdminUsers(opts: {
  search?: string
  plan?: string
  limit?: number
  offset?: number
}): Promise<AdminUserRow[]> {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc('admin_list_users' as any, {
    p_search: opts.search ?? null,
    p_plan: opts.plan ?? null,
    p_limit: opts.limit ?? 50,
    p_offset: opts.offset ?? 0,
  })
  if (error) throw error
  return (data ?? []) as AdminUserRow[]
}

export async function getAdminUserDetail(userId: string) {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc('admin_user_detail' as any, { p_user_id: userId })
  if (error) throw error
  return data as Record<string, unknown> | null
}

export async function getAdminLlmUsage(days = 14) {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc('admin_llm_usage' as any, { p_days: days })
  if (error) throw error
  return data as {
    by_day: Array<{ day: string; calls: number; cost_usd: number; tokens: number }>
    by_route: Array<{ route: string; calls: number; cost_usd: number; error_rate: number }>
    by_model: Array<{ model: string; calls: number; cost_usd: number }>
    top_spenders: Array<{ user_id: string; email: string | null; cost_usd: number; calls: number }>
  }
}

export async function getAdminOutcomes() {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc('admin_outcomes_summary' as any)
  if (error) throw error
  return data as {
    counts: { passed: number; failed: number; unknown: number; pending_capture: number }
    by_score: Array<{ bucket: number; n: number }>
    recent: Array<{
      user_id: string
      email: string
      outcome: string
      score: number | null
      exam_date: string | null
      last_readiness: number | null
    }>
  }
}

export async function getAdminFailedDocuments(limit = 50) {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc('admin_failed_documents' as any, { p_limit: limit })
  if (error) throw error
  return (data ?? []) as Array<{
    id: string
    user_id: string | null
    email: string | null
    filename: string
    file_size: number
    processing_status: string
    error_message: string | null
    created_at: string
  }>
}

export async function getAdminRecentActions(limit = 100) {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc('admin_recent_actions' as any, { p_limit: limit })
  if (error) throw error
  return (data ?? []) as Array<{
    id: string
    created_at: string
    admin_email: string | null
    action: string
    target_user_id: string | null
    details: Record<string, unknown> | null
  }>
}

export type AdminUnitEconomics = {
  window_days: number
  overview: {
    mrr_usd: number
    paying_users: number
    active_users_window: number
    llm_cost_window_usd: number
    revenue_window_usd: number
    cost_per_active_user_usd: number
    gross_margin: number | null
    ltv_estimate_usd: number
  }
  by_plan: Array<{
    plan: string
    subscribers: number
    active_users: number
    llm_cost_usd: number
    mrr_usd: number
    arpu_usd: number
    cost_per_active_user_usd: number
    gross_margin: number | null
  }>
  cohorts: Array<{
    cohort_month: string
    signups: number
    active_30d: number
    retention_30d: number
    paying_now: number
    conversion: number
    cumulative_llm_cost_usd: number
  }>
  top_cost_users: Array<{
    user_id: string
    email: string | null
    plan: string
    cost_usd: number
    calls: number
  }>
  alerts: Array<{ severity: 'danger' | 'warning' | 'info'; code: string; message: string }>
}

export async function getAdminUnitEconomics(days = 30): Promise<AdminUnitEconomics> {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc('admin_unit_economics' as any, { p_days: days })
  if (error) throw error
  return data as AdminUnitEconomics
}

export async function recordAdminAction(opts: {
  adminEmail: string
  action: string
  targetUserId?: string | null
  details?: Record<string, unknown>
}) {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('admin_actions') as any).insert({
    admin_email: opts.adminEmail,
    action: opts.action,
    target_user_id: opts.targetUserId ?? null,
    details: opts.details ?? null,
  })
}
