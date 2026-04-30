export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser, createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { logger } from "@/lib/logger";
import { z } from "zod";

export async function GET() {
  const user = await requireAuthenticatedUser();
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("profiles") as any)
    .select("study_minutes_per_day, email_nudges_enabled")
    .eq("id", user.id)
    .single();
  if (error) {
    logger.error({ err: error, userId: user.id }, "GET /api/profile/me failed");
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
  return NextResponse.json({ data });
}

const PatchSchema = z.object({
  study_minutes_per_day: z.number().int().min(5).max(240).optional(),
  email_nudges_enabled: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, { message: "Nothing to update" });

export async function PATCH(req: NextRequest) {
  const user = await requireAuthenticatedUser();
  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.format() }, { status: 400 });
  }

  const supabase = createAdminClient();
  const update: Record<string, unknown> = {};
  if (parsed.data.study_minutes_per_day !== undefined) {
    update["study_minutes_per_day"] = parsed.data.study_minutes_per_day;
  }
  if (parsed.data.email_nudges_enabled !== undefined) {
    update["email_nudges_enabled"] = parsed.data.email_nudges_enabled;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("profiles") as any).update(update).eq("id", user.id);
  if (error) {
    logger.error({ err: error, userId: user.id }, "Failed to update profile settings");
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await requireAuthenticatedUser();
  const userId = user.id;

  const admin = createAdminClient();

  // 1. Cancel Stripe subscription if any (so we don't keep billing)
  try {
    // PostgREST returns { data, error } on DB failures rather than throwing,
    // so the surrounding try/catch only catches true exceptions. Without
    // destructuring the error, a silent failure on this lookup masks the
    // subscription row and we skip the Stripe cancel entirely — user
    // deletes the account but Stripe keeps charging the card on file every
    // renewal. THIS is the PR #34 money-leak: raise subErr so the log trail
    // ties missed cancels back to real DB failures. We don't throw, because
    // after a successful GDPR delete we must not 5xx; best we can do is
    // surface the signal.
    const { data: sub, error: subErr } = await admin
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("user_id", userId)
      .single();

    if (subErr) {
      logger.error(
        { err: subErr, userId },
        "Failed to look up subscription on account delete — Stripe cancel may be skipped; manual reconciliation required"
      );
    }

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
