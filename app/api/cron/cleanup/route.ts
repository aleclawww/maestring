export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runCron } from "@/lib/cron/run";
import { logger } from "@/lib/logger";
import { verifyCronSecret } from "@/lib/auth/verify-cron-secret";

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const outcome = await runCron("cleanup", async () => {
    const supabase = createAdminClient();
    const now = new Date();

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: jtiDeleted, error: jtiErr } = await supabase
      .from("magic_link_uses")
      .delete({ count: "exact" })
      .lt("used_at", thirtyDaysAgo);
    if (jtiErr) logger.warn({ err: jtiErr.message }, "cleanup: magic_link_uses delete failed");

    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const { count: sessionsAbandoned, error: sessErr } = await supabase
      .from("study_sessions")
      .update({ status: "abandoned" }, { count: "exact" })
      .eq("status", "active")
      .lt("started_at", twoDaysAgo);
    if (sessErr) logger.warn({ err: sessErr.message }, "cleanup: study_sessions abandon failed");

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: failedDocs, error: docsQueryErr } = await supabase
      .from("user_documents")
      .select("id, storage_path")
      .eq("processing_status", "failed")
      .lt("created_at", sevenDaysAgo);
    if (docsQueryErr) logger.warn({ err: docsQueryErr.message }, "cleanup: failed_docs select failed");

    // Per-doc: delete storage FIRST so we never leave orphan objects in the
    // bucket. If storage.remove errors we keep the DB row — next cron run
    // will retry. Treat "not found" as success (idempotent re-run after a
    // previous partial failure). Only count docs where BOTH sides succeed.
    let docsDeleted = 0;
    let docsStorageOrphaned = 0;
    let docsDbOrphaned = 0;
    if (failedDocs && failedDocs.length > 0) {
      for (const doc of failedDocs) {
        const { error: rmErr } = await supabase.storage
          .from("user-documents")
          .remove([doc.storage_path]);
        // Supabase storage returns error for not-found in some versions, null
        // in others; treat a "not found" message as already-cleaned.
        const storageOk = !rmErr || /not.?found/i.test(rmErr.message ?? "");
        if (!storageOk) {
          logger.warn(
            { docId: doc.id, path: doc.storage_path, err: rmErr.message },
            "cleanup: storage.remove failed — skipping DB delete to retry next run",
          );
          docsStorageOrphaned++;
          continue;
        }
        const { error: delErr } = await supabase
          .from("user_documents")
          .delete()
          .eq("id", doc.id);
        if (delErr) {
          logger.warn(
            { docId: doc.id, err: delErr.message },
            "cleanup: user_documents delete failed — storage already removed",
          );
          docsDbOrphaned++;
          continue;
        }
        docsDeleted++;
      }
    }

    // 90-day retention for operational ledgers — see docs/security/data-retention.md.
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { count: stripeEventsDeleted, error: stripeErr } = await supabase
      .from("stripe_events")
      .delete({ count: "exact" })
      .lt("received_at", ninetyDaysAgo);
    if (stripeErr) logger.warn({ err: stripeErr.message }, "cleanup: stripe_events delete failed");

    const { count: cronRunsDeleted, error: cronErr } = await supabase
      .from("cron_runs")
      .delete({ count: "exact" })
      .lt("started_at", ninetyDaysAgo);
    if (cronErr) logger.warn({ err: cronErr.message }, "cleanup: cron_runs delete failed");

    const metadata = {
      jtiDeleted: jtiDeleted ?? 0,
      sessionsAbandoned: sessionsAbandoned ?? 0,
      docsDeleted,
      docsStorageOrphaned,
      docsDbOrphaned,
      stripeEventsDeleted: stripeEventsDeleted ?? 0,
      cronRunsDeleted: cronRunsDeleted ?? 0,
    };
    return {
      status: "ok" as const,
      rowsAffected:
        (jtiDeleted ?? 0) +
        (sessionsAbandoned ?? 0) +
        docsDeleted +
        (stripeEventsDeleted ?? 0) +
        (cronRunsDeleted ?? 0),
      metadata,
    };
  });

  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 500 });
  return NextResponse.json(outcome.result);
}

// Vercel Cron invokes scheduled jobs with GET (docs: https://vercel.com/docs/cron-jobs).
// Without this export the cron silently 405s and the job never runs — the
// Authorization: Bearer <CRON_SECRET> header is attached either way, so the
// POST-only handler would reject it at the HTTP method layer before auth even
// runs. Delegates to POST so there's exactly one implementation.
// Matches the pattern already in app/api/cron/snapshot-readiness/route.ts.
export async function GET(req: NextRequest) {
  return POST(req);
}
