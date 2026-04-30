export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // Validate referral code before passing it to Stripe.
  // Without this check, any user can pass an arbitrary string as referralCode
  // and receive a 7-day free trial — even if the code doesn't exist in the DB.
  let validatedReferralCode: string | undefined;
  if (body.referralCode) {
    const supabase = createAdminClient();
    const { data: referral } = await supabase
      .from("referrals")
      .select("id")
      .eq("code", body.referralCode)
      .eq("referred_id", user.id)
      .is("converted_at", null) // not already used
      .maybeSingle();

    if (referral) {
      validatedReferralCode = body.referralCode;
    } else {
      logger.warn(
        { userId: user.id, referralCode: body.referralCode },
        "checkout: referral code not found or already used — trial not applied"
      );
    }
  }

  try {
    const url = await createCheckoutSession(user.id, priceId, validatedReferralCode);
    return NextResponse.json({ url });
  } catch (err) {
    logger.error({ err, userId: user.id, plan }, "Failed to create checkout session");
    return NextResponse.json(
      { error: "Failed to start checkout" },
      { status: 500 }
    );
  }
}
