import { NextResponse } from "next/server";
import { requireAuthenticatedUser, createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { logger } from "@/lib/logger";

export async function DELETE() {
  const user = await requireAuthenticatedUser();
  const userId = user.id;

  const admin = createAdminClient();

  // 1. Cancel Stripe subscription if any (so we don't keep billing)
  try {
    const { data: sub } = await admin
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("user_id", userId)
      .single();

    if (sub?.stripe_subscription_id) {
      const stripe = getStripe();
      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    }
  } catch (err) {
    logger.warn({ err, userId }, "Failed to cancel Stripe subscription on account delete");
  }

  // 2. Delete the auth user. RLS + ON DELETE CASCADE on profiles/sessions/etc.
  //    cleans up the rest. (Migrations declare FKs onto auth.users.)
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    logger.error({ err: error, userId }, "Failed to delete auth user");
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }

  // 3. Sign out the current session cookie
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch {
    /* cookies will be invalid anyway after auth user delete */
  }

  logger.info({ userId }, "Account deleted by user request (GDPR)");
  return NextResponse.json({ ok: true });
}
