import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPortalSession } from "@/lib/stripe";
import { logger } from "@/lib/logger";

export async function POST() {
  const user = await requireAuthenticatedUser();
  const supabase = createAdminClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

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
