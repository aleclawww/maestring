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

  // 3. Sign out the current session cookie. Even though the auth user has
  //    already been deleted (so the cookies are effectively invalid), we
  //    still try to signOut so Set-Cookie headers come back clean. An empty
  //    catch here hid silent failures (cookie adapter throws, Supabase SDK
  //    rejects, etc.); log them as warn so post-deletion login-loop reports
  //    from users have a log trail to correlate against. Don't rethrow —
  //    the primary deletion already succeeded and we must not 5xx after a
  //    successful GDPR delete.
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch (err) {
    logger.warn(
      { err, userId },
      "signOut failed after account delete — cookies may linger but auth user is already gone"
    );
  }

  logger.info({ userId }, "Account deleted by user request (GDPR)");
  return NextResponse.json({ ok: true });
}
