import posthog from "posthog-js";

// Canonical event taxonomy (plan A5.2). Add new events here — inline string
// literals defeat the point of the discriminated union.
export type AnalyticsEvent =
  // Auth & onboarding
  | { name: "signup_completed"; properties?: { method?: "magic" | "google" } }
  | { name: "onboarding_started" }
  | { name: "onboarding_step_completed"; properties: { step: number; step_name: string } }
  | { name: "onboarding_completed"; properties?: { exam_target_date?: string; minutes_per_day?: number } }
  // Study loop
  | { name: "study_session_started"; properties: { mode: string; session_id?: string } }
  | { name: "study_session_completed"; properties: { mode: string; session_id?: string; total: number; correct: number } }
  | { name: "study_session_abandoned"; properties: { mode: string; session_id?: string; questions_answered: number } }
  | { name: "question_answered"; properties: { is_correct: boolean; mode: string; time_taken_ms: number; concept_id?: string; first_attempt_correct?: boolean; used_hint?: boolean } }
  | { name: "hint_revealed"; properties: { concept_id?: string; question_id?: string; proactive?: boolean } }
  | { name: "deep_explanation_opened"; properties: { concept_id?: string; question_id?: string } }
  // Readiness & milestones
  | { name: "readiness_milestone_hit"; properties: { score: number; band: "50" | "70" | "85" } }
  | { name: "streak_bumped"; properties: { length: number } }
  | { name: "streak_broken"; properties: { previous_length: number } }
  // Documents
  | { name: "document_uploaded"; properties: { pages?: number; size_bytes?: number } }
  | { name: "document_processed"; properties: { document_id: string; chunks: number; questions_generated: number; elapsed_ms: number } }
  | { name: "document_failed"; properties: { document_id: string; stage: "parse" | "chunk" | "embed" | "generate"; error?: string } }
  // Monetization
  | { name: "quota_hit"; properties: { used: number; quota: number; plan: string } }
  | { name: "checkout_started"; properties?: { plan?: string } }
  | { name: "subscription_created"; properties?: { plan?: string } }
  | { name: "subscription_cancelled"; properties?: { plan?: string; reason?: string } }
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
