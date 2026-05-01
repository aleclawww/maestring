import { PostHog } from "posthog-node";
import { logger } from "@/lib/logger";

// Server-side counterpart to lib/analytics.ts. Use this from route handlers,
// webhooks, and cron jobs — anywhere there is no browser posthog-js. The
// event taxonomy is intentionally the SAME as client-side (see AnalyticsEvent
// union in lib/analytics.ts) so funnels in PostHog combine both sources.

let _client: PostHog | null = null;

function getClient(): PostHog | null {
  if (_client) return _client;
  const key = process.env["NEXT_PUBLIC_POSTHOG_KEY"] ?? process.env["POSTHOG_API_KEY"];
  if (!key) return null;
  _client = new PostHog(key, {
    host: process.env["NEXT_PUBLIC_POSTHOG_HOST"] ?? "https://app.posthog.com",
    // flushAt=1 keeps serverless-friendly: no batching between invocations.
    flushAt: 1,
    flushInterval: 0,
  });
  return _client;
}

type ServerEvent =
  | { name: "subscription_created"; properties?: { plan?: string } }
  | { name: "subscription_cancelled"; properties?: { plan?: string; reason?: string } }
  | { name: "subscription_payment_failed"; properties?: { plan?: string } }
  | { name: "referral_converted"; properties?: { referrer_user_id?: string; price_usd?: number } };

/**
 * Emit an analytics event from server code. Fail-open: if PostHog is
 * misconfigured or network flakes, we log warn and continue — never let
 * analytics break the billing path.
 *
 * Always passes `distinctId` so PostHog attributes the event to the user
 * (matches the client-side `identify()` call on login).
 */
export async function trackServer(distinctId: string, event: ServerEvent): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    client.capture({
      distinctId,
      event: event.name,
      properties: (event as { properties?: Record<string, unknown> }).properties ?? {},
    });
    await client.flush();
  } catch (err) {
    logger.warn(
      { err, eventName: event.name, distinctId },
      "trackServer: PostHog capture failed — event dropped (does not affect business logic)"
    );
  }
}
