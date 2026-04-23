import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runCron } from "@/lib/cron/run";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env["CRON_SECRET"]}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const outcome = await runCron("cleanup", async () => {
    const supabase = createAdminClient();
    const now = new Date();

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: jtiDeleted } = await supabase
      .from("magic_link_uses")
      .delete({ count: "exact" })
      .lt("used_at", thirtyDaysAgo);

    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const { count: sessionsAbandoned } = await supabase
      .from("study_sessions")
      .update({ status: "abandoned" }, { count: "exact" })
      .eq("status", "active")
      .lt("started_at", twoDaysAgo);

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: failedDocs } = await supabase
      .from("user_documents")
      .select("id, storage_path")
      .eq("processing_status", "failed")
      .lt("created_at", sevenDaysAgo);

    let docsDeleted = 0;
    if (failedDocs && failedDocs.length > 0) {
      for (const doc of failedDocs) {
        await supabase.storage.from("user-documents").remove([doc.storage_path]);
        await supabase.from("user_documents").delete().eq("id", doc.id);
        docsDeleted++;
      }
    }

    // 90-day retention for operational ledgers — see docs/security/data-retention.md.
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { count: stripeEventsDeleted } = await supabase
      .from("stripe_events")
      .delete({ count: "exact" })
      .lt("received_at", ninetyDaysAgo);
    const { count: cronRunsDeleted } = await supabase
      .from("cron_runs")
      .delete({ count: "exact" })
      .lt("started_at", ninetyDaysAgo);

    const metadata = {
      jtiDeleted: jtiDeleted ?? 0,
      sessionsAbandoned: sessionsAbandoned ?? 0,
      docsDeleted,
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
