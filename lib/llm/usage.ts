import { createAdminClient } from '@/lib/supabase/admin'
import logger from '@/lib/logger'

// USD per 1M tokens. Keep in sync with Anthropic pricing page.
// Adjust when new models are added; never hardcode at call sites.
const PRICING_USD_PER_MTOK: Record<string, { input: number; output: number; cached: number }> = {
  'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0, cached: 0.1 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0, cached: 0.3 },
  'claude-opus-4-7': { input: 15.0, output: 75.0, cached: 1.5 },
}

export interface LlmUsageRecord {
  userId: string | null
  route: string
  model: string
  inputTokens: number
  outputTokens: number
  cachedInputTokens?: number
  latencyMs?: number
  success?: boolean
  errorCode?: string | null
  metadata?: Record<string, unknown>
}

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens = 0
): number {
  const p = PRICING_USD_PER_MTOK[model]
  if (!p) return 0
  const inputCost = ((inputTokens - cachedInputTokens) * p.input) / 1_000_000
  const outputCost = (outputTokens * p.output) / 1_000_000
  const cachedCost = (cachedInputTokens * p.cached) / 1_000_000
  return Math.max(0, inputCost + outputCost + cachedCost)
}

// Fire-and-forget — we never want logging to block the hot path.
export function recordLlmUsage(u: LlmUsageRecord): void {
  const cost = estimateCostUsd(u.model, u.inputTokens, u.outputTokens, u.cachedInputTokens ?? 0)
  const admin = createAdminClient()
  // llm_usage table columns don't yet appear in the generated types; cast required.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usagePayload: any = {
    user_id: u.userId,
    route: u.route,
    model: u.model,
    input_tokens: u.inputTokens,
    output_tokens: u.outputTokens,
    cached_input_tokens: u.cachedInputTokens ?? 0,
    cost_usd: cost,
    latency_ms: u.latencyMs ?? null,
    success: u.success ?? true,
    error_code: u.errorCode ?? null,
    metadata: u.metadata ?? null,
  }
  void admin
    .from('llm_usage')
    .insert(usagePayload)
    .then(({ error }) => {
      if (error) logger.warn({ error: error.message }, 'llm_usage insert failed')
    })
}
