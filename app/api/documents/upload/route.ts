import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkUploadRateLimit } from "@/lib/redis/rate-limit";
import { logger } from "@/lib/logger";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser();

  const rl = await checkUploadRateLimit(user.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Upload limit reached (10 per hour)" }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 50 MB)" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const filename = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  // Upload to Supabase Storage
  const bytes = await file.arrayBuffer();
  const { error: storageError } = await supabase.storage
    .from("user-documents")
    .upload(filename, bytes, { contentType: "application/pdf", upsert: false });

  if (storageError) {
    logger.error({ error: storageError, userId: user.id }, "Storage upload failed");
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  // Create document record
  const { data: doc, error: dbError } = await supabase
    .from("user_documents")
    .insert({
      user_id: user.id,
      filename: file.name,
      storage_path: filename,
      file_size_bytes: file.size,
      title: title ?? file.name.replace(/\.pdf$/i, ""),
      processing_status: "pending",
    })
    .select()
    .single();

  if (dbError) {
    logger.error({ error: dbError }, "DB record creation failed");
    return NextResponse.json({ error: "Failed to create document record" }, { status: 500 });
  }

  // Trigger background processing (fire-and-forget)
  // In production this would enqueue a job; here we call inline
  void triggerProcessing(doc.id);

  logger.info({ docId: doc.id, userId: user.id, filename }, "Document uploaded");
  return NextResponse.json({ document: doc }, { status: 201 });
}

async function triggerProcessing(docId: string) {
  const baseUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
  try {
    await fetch(`${baseUrl}/api/documents/${docId}/process`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env["CRON_SECRET"]}` },
    });
  } catch {
    logger.error({ docId }, "Failed to trigger document processing");
  }
}
