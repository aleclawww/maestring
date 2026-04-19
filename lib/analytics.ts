import posthog from "posthog-js";

export type AnalyticsEvent =
  | { name: "signup_completed"; properties?: { method?: "magic" | "google" } }
  | { name: "onboarding_completed"; properties?: { exam_target_date?: string; minutes_per_day?: number } }
  | { name: "study_session_started"; properties: { mode: string; session_id?: string } }
  | { name: "study_session_completed"; properties: { mode: string; session_id?: string; total: number; correct: number } }
  | { name: "question_answered"; properties: { is_correct: boolean; mode: string; time_taken_ms: number; concept_id?: string } }
  | { name: "quota_hit"; properties: { used: number; quota: number; plan: string } }
  | { name: "subscription_created"; properties?: { plan?: string } }
  | { name: "checkout_started"; properties?: { plan?: string } }
  | { name: "outcome_captured"; properties: { outcome: "passed" | "failed" | "unknown"; scaled_score?: number | null } };

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
