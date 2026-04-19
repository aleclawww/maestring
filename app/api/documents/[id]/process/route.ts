import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runIngestionPipeline } from "@/lib/ingestion/ingestion-pipeline";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env["CRON_SECRET"]}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: doc } = await supabase
    .from("user_documents")
    .select("id, user_id, storage_path, processing_status")
    .eq("id", params.id)
    .single();

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (doc.processing_status === "completed") {
    return NextResponse.json({ message: "Already processed" });
  }

  logger.info({ docId: doc.id, userId: doc.user_id }, "Starting ingestion pipeline");

  const result = await runIngestionPipeline({
    documentId: doc.id,
    userId: doc.user_id,
    storagePath: doc.storage_path,
  });

  return NextResponse.json(result);
}
