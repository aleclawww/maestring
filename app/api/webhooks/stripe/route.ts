import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaymentFailed,
  handleInvoicePaymentSucceeded,
} from "@/lib/stripe/webhooks";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureApiException } from "@/lib/sentry/capture";

const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"]!, { apiVersion: "2024-06-20" });

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env["STRIPE_WEBHOOK_SECRET"]!
    );
  } catch (err) {
    logger.error({ err }, "Stripe webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // --- Idempotency gate -----------------------------------------------------
  // Insert the event id; if it already exists, Stripe is retrying a delivery
  // we already accepted — ack with 200 and skip the handler.
  const supabase = createAdminClient();
  const { error: insertErr } = await supabase
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });

  if (insertErr) {
    // 23505 = unique_violation → row already exists. Only skip if the previous
    // attempt actually finished (processed_at is set). If it failed mid-way,
    // let Stripe's retry re-run the handler.
    const isDuplicate = (insertErr as { code?: string }).code === "23505";
    if (isDuplicate) {
      const { data: existing } = await supabase
        .from("stripe_events")
        .select("processed_at")
        .eq("id", event.id)
        .maybeSingle();
      if (existing?.processed_at) {
        logger.info({ eventId: event.id, type: event.type }, "Stripe event already processed — skipping");
        return NextResponse.json({ received: true, duplicate: true });
      }
      logger.info({ eventId: event.id, type: event.type }, "Retrying previously-failed Stripe event");
    } else {
      // Other insert errors: log but don't block payment processing.
      captureApiException(insertErr, { route: "/api/webhooks/stripe", extra: { eventId: event.id } });
      logger.error({ err: insertErr, eventId: event.id }, "Failed to write stripe_events row");
    }
  }
  // -------------------------------------------------------------------------

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      default:
        logger.info({ type: event.type }, "Unhandled Stripe event");
    }

    // Mark the event processed so the idempotency gate above short-circuits
    // any Stripe retries. If this write fails, the next delivery will see
    // `processed_at IS NULL` and re-run the handler — the handleX functions
    // are idempotent (PR #24) so a duplicate run is safe, but we must NOT
    // silently drop this write: returning 500 here lets Stripe retry on a
    // real backoff schedule rather than compounding duplicate work forever.
    const { error: markErr } = await supabase
      .from("stripe_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", event.id);
    if (markErr) {
      captureApiException(markErr, { route: "/api/webhooks/stripe", extra: { eventId: event.id, type: event.type } });
      logger.error(
        { err: markErr, eventType: event.type, eventId: event.id },
        "Failed to mark stripe_events row processed — forcing Stripe retry"
      );
      return NextResponse.json({ error: "Bookkeeping failed" }, { status: 500 });
    }
  } catch (err) {
    // Record the failure so we can see it in the ledger and let Stripe retry.
    // If THIS update fails we still log + 500 — we cannot let the original
    // handler error get swallowed on top of a failed ledger write.
    const { error: ledgerErr } = await supabase
      .from("stripe_events")
      .update({ error: err instanceof Error ? err.message : String(err) })
      .eq("id", event.id);
    if (ledgerErr) {
      logger.error(
        { err: ledgerErr, eventId: event.id, originalErr: err },
        "Also failed to write stripe_events error column (original handler still failing)"
      );
    }
    captureApiException(err, { route: "/api/webhooks/stripe", extra: { eventId: event.id, type: event.type } });
    logger.error({ err, eventType: event.type, eventId: event.id }, "Stripe webhook handler failed");
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
