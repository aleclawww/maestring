export const runtime = 'nodejs'

import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPortalSession } from "@/lib/stripe";
import { logger } from "@/lib/logger";

export async function POST() {
  const user = await requireAuthenticatedUser();
  const supabase = createAdminClient();

  const { data: subscription, error: subErr } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  if (subErr) {
    // A silent swallow here masks two very different failure modes:
    //   (a) the user genuinely has no subscription (expected 404), and
    //   (b) RLS/SDK error reading the row (user locked out of their
    //       billing portal despite having a real, paying subscription).
    // The old bare destructure rendered both as the same "No subscription
    // found" 404 — a paying Pro user would see "create a subscription"
    // when they already have one. Log the error and return a distinct
    // 500 so the user can retry and support can correlate.
    logger.error(
      { err: subErr, userId: user.id },
      "Failed to load subscription row for Stripe portal redirect"
    );
    return NextResponse.json({ error: "Failed to load subscription" }, { status: 500 });
  }

  if (!subscription?.stripe_customer_id) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  try {
    const baseUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
    const session = await createPortalSession(
      subscription.stripe_customer_id,
      `${baseUrl}/settings/billing`
    );
    return NextResponse.json({ url: session.url });
  } catch (err) {
    logger.error({ err, userId: user.id }, "Failed to create portal session");
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
  }
}
