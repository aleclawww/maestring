// ─── Tipos de Suscripción y Stripe ───────────────────────────────────────────

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export type PlanType = "free" | "monthly" | "annual" | "lifetime";

export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  plan: PlanType;
  status: SubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PricingPlan {
  id: PlanType;
  name: string;
  description: string;
  price: {
    monthly: number | null;
    annual: number | null;
    lifetime: number | null;
  };
  stripePriceId: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

export interface CheckoutSession {
  url: string;
  sessionId: string;
}

export interface BillingPortalSession {
  url: string;
}
