import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/stripe";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser();

  let body: { plan?: "monthly" | "annual"; referralCode?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — defaults below
  }

  const plan = body.plan ?? "monthly";
  const priceId =
    plan === "annual"
      ? process.env["STRIPE_PRICE_PRO_ANNUAL"]
      : process.env["STRIPE_PRICE_PRO_MONTHLY"];

  if (!priceId) {
    logger.error({ plan }, "Missing Stripe price ID env var");
    return NextResponse.json(
      { error: "Pricing not configured" },
      { status: 500 }
    );
  }

  try {
    const url = await createCheckoutSession(user.id, priceId, body.referralCode);
    return NextResponse.json({ url });
  } catch (err) {
    logger.error({ err, userId: user.id, plan }, "Failed to create checkout session");
    return NextResponse.json(
      { error: "Failed to start checkout" },
      { status: 500 }
    );
  }
}
