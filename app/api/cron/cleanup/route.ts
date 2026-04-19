import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env["CRON_SECRET"]}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  // 1. Expire old magic link JTIs (older than 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: jtiDeleted } = await supabase
    .from("magic_link_uses")
    .delete({ count: "exact" })
    .lt("used_at", thirtyDaysAgo);

  // 2. Mark abandoned sessions older than 2 days
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const { count: sessionsAbandoned } = await supabase
    .from("study_sessions")
    .update({ status: "abandoned" }, { count: "exact" })
    .eq("status", "active")
    .lt("started_at", twoDaysAgo);

  // 3. Delete failed documents older than 7 days
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

  const result = {
    jtiDeleted: jtiDeleted ?? 0,
    sessionsAbandoned: sessionsAbandoned ?? 0,
    docsDeleted,
  };

  logger.info(result, "Cleanup cron completed");
  return NextResponse.json(result);
}
