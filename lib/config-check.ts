/**
 * Configuration health utilities.
 *
 * Detects missing or placeholder ("TODO_*") environment variables so the app
 * can surface actionable setup instructions instead of cryptic 500 errors.
 *
 * All functions run SERVER-SIDE only — never import from client components.
 */

/** Returns true only when a var is set AND is not a placeholder value. */
export function isConfigured(key: string): boolean {
  const val = process.env[key]
  return !!val && !val.startsWith('TODO_') && val.length > 0
}

export const CONFIG_STATUS = {
  /** Claude Haiku — optional enhancement for question generation (static generator works without it) */
  get anthropic() {
    return isConfigured('ANTHROPIC_API_KEY')
  },
  /** OpenAI text-embedding — required for PDF upload & vector search */
  get openai() {
    return isConfigured('OPENAI_API_KEY')
  },
  /** Stripe secret key — required for checkout / portal */
  get stripe() {
    return isConfigured('STRIPE_SECRET_KEY')
  },
  /** Stripe price IDs — required for checkout */
  get stripePrices() {
    return (
      isConfigured('STRIPE_PRICE_PRO_MONTHLY') &&
      isConfigured('STRIPE_PRICE_PRO_ANNUAL')
    )
  },
  /** Upstash Redis — optional (fails open) */
  get redis() {
    return (
      isConfigured('UPSTASH_REDIS_REST_URL') &&
      isConfigured('UPSTASH_REDIS_REST_TOKEN')
    )
  },
}

export type SetupWarning = {
  feature: string
  description: string
  envVars: string[]
}

/** Returns a list of un-configured features for the dashboard banner. */
export function getSetupWarnings(): SetupWarning[] {
  const warnings: SetupWarning[] = []

  // NOTE: ANTHROPIC_API_KEY is optional — the static generator produces full
  // MCQ questions from the knowledge graph without any API key. LLM generation
  // is only used as a fallback for concepts not yet in aws-saa.ts.
  // We therefore do NOT surface a warning for missing ANTHROPIC_API_KEY.

  if (!CONFIG_STATUS.stripe || !CONFIG_STATUS.stripePrices) {
    warnings.push({
      feature: 'Payments / Upgrade to Pro',
      description:
        'Stripe is not configured — the Upgrade button will show an error. Study sessions work without it.',
      envVars: !CONFIG_STATUS.stripe
        ? ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_PRO_MONTHLY', 'STRIPE_PRICE_PRO_ANNUAL']
        : ['STRIPE_PRICE_PRO_MONTHLY', 'STRIPE_PRICE_PRO_ANNUAL'],
    })
  }

  if (!CONFIG_STATUS.openai) {
    warnings.push({
      feature: 'PDF upload / Document search',
      description: 'OpenAI embeddings are required for PDF ingestion and semantic search.',
      envVars: ['OPENAI_API_KEY'],
    })
  }

  return warnings
}
