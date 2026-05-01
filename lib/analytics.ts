import posthog from "posthog-js";

// Canonical event taxonomy (plan A5.2). Add new events here — inline string
// literals defeat the point of the discriminated union.
export type AnalyticsEvent =
  // Auth & onboarding
  | { name: "signup_started"; properties?: { method?: "magic" | "google"; utm_source?: string; utm_medium?: string; utm_campaign?: string; referral_code?: string } }
  | { name: "signup_completed"; properties?: { method?: "magic" | "google" } }
  | { name: "onboarding_started" }
  | { name: "onboarding_step_completed"; properties: { step: number; step_name: string; time_on_step_ms?: number } }
  | { name: "onboarding_completed"; properties?: { exam_target_date?: string; minutes_per_day?: number; total_time_ms?: number; exam_date_set?: boolean } }
  // Study loop
  | { name: "study_session_started"; properties: { mode: string; session_id?: string; domain_id?: string; journey_phase?: string } }
  | { name: "study_session_completed"; properties: { mode: string; session_id?: string; total: number; correct: number; duration_ms?: number } }
  | { name: "study_session_abandoned"; properties: { mode: string; session_id?: string; questions_answered: number } }
  | { name: "question_generated"; properties: { concept_id?: string; domain_id?: string; difficulty?: number; gen_latency_ms?: number } }
  | { name: "question_answered"; properties: { is_correct: boolean; mode: string; time_taken_ms: number; concept_id?: string; first_attempt_correct?: boolean; used_hint?: boolean; fsrs_rating?: 1 | 2 | 3 | 4 } }
  | { name: "first_correct_answer"; properties: { concept_id?: string; minutes_since_signup?: number } }
  | { name: "hint_revealed"; properties: { concept_id?: string; question_id?: string; proactive?: boolean } }
  | { name: "deep_explanation_opened"; properties: { concept_id?: string; question_id?: string } }
  // Readiness & milestones
  | { name: "readiness_score_viewed"; properties: { score: number; days_to_exam?: number; journey_phase?: string } }
  | { name: "readiness_milestone_hit"; properties: { score: number; band: "50" | "70" | "85" } }
  | { name: "streak_bumped"; properties: { length: number } }
  | { name: "streak_broken"; properties: { previous_length: number } }
  | { name: "streak_milestone"; properties: { streak_days: number } }
  // Documents
  | { name: "document_uploaded"; properties: { pages?: number; size_bytes?: number } }
  | { name: "document_processed"; properties: { document_id: string; chunks: number; questions_generated: number; elapsed_ms: number } }
  | { name: "document_failed"; properties: { document_id: string; stage: "parse" | "chunk" | "embed" | "generate"; error?: string } }
  // Monetization — every surface that can trigger an upgrade
  | { name: "paywall_viewed"; properties: { surface: "daily_limit" | "pdf_upload" | "rag" | "readiness_score" | "exam_simulator" | "full_history" | "exit_intent"; plan_shown?: "monthly" | "annual" } }
  | { name: "upgrade_clicked"; properties: { surface: string; plan_clicked: "monthly" | "annual"; price_usd: number } }
  | { name: "quota_hit"; properties: { used: number; quota: number; plan: string } }
  | { name: "checkout_started"; properties?: { plan?: string; price_usd?: number; coupon_id?: string } }
  | { name: "checkout_completed"; properties?: { plan?: string; price_usd?: number; coupon_id?: string } }
  | { name: "subscription_created"; properties?: { plan?: string } }
  | { name: "subscription_cancelled"; properties?: { plan?: string; reason?: string; tenure_months?: number; save_offer_shown?: boolean } }
  | { name: "payment_failed"; properties?: { attempt?: number; decline_code?: string } }
  | { name: "cancel_flow_started"; properties?: { tenure_months?: number; health_score?: number } }
  // Referrals
  | { name: "referral_invited"; properties: { channel: "copy" | "whatsapp" | "email" | "twitter" } }
  | { name: "referral_converted"; properties: { referrer_user_id?: string; price_usd?: number } }
  // Email engagement
  | { name: "nudge_email_clicked"; properties: { email_type: "streak" | "reactivation" | "exam_reminder" | "trial_day1" | "trial_day3" | "trial_day5" | "trial_day7"; cta_href?: string } }
  // Outcomes & signals
  | { name: "outcome_captured"; properties: { outcome: "passed" | "failed" | "unknown"; scaled_score?: number | null } }
  | { name: "churn_signal"; properties: { days_inactive: number; last_session_at?: string } };

function isInitialized(): boolean {
  if (typeof window === "undefined") return false;
  // posthog-js sets __loaded internal flag; guard with try/catch
  try {
    return Boolean((posthog as unknown as { __loaded?: boolean }).__loaded);
  } catch {
    return false;
  }
}

export function track(event: AnalyticsEvent): void {
  if (!isInitialized()) return;
  posthog.capture(event.name, (event as { properties?: Record<string, unknown> }).properties ?? {});
}

export function identify(userId: string, traits?: Record<string, unknown>): void {
  if (!isInitialized()) return;
  posthog.identify(userId, traits);
}

export function reset(): void {
  if (!isInitialized()) return;
  posthog.reset();
}
