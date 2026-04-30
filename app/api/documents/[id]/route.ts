export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { logger } from "@/lib/logger";

const idSchema = z.string().uuid();

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuthenticatedUser();

  if (!idSchema.safeParse(params.id).success) {
    return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Ownership gate: fetch the row before acting. Using the admin client here
  // so we can always read the row regardless of the user's session — but we
  // enforce ownership manually with .eq("user_id", user.id) so no user can
  // delete another user's document.
  const { data: doc, error: fetchErr } = await supabase
    .from("user_documents")
    .select("id, user_id, storage_path")
    .eq("id", params.id)
    .eq("user_id", user.id)      // ownership gate
    .maybeSingle();

  if (fetchErr) {
    logger.error({ err: fetchErr, docId: params.id, userId: user.id }, "Failed to fetch document for delete");
    return NextResponse.json({ error: "Failed to load document" }, { status: 500 });
  }
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Delete from storage first. If this fails, keep the DB row so the next
  // attempt can retry. A missing object in storage is treated as success
  // (idempotent re-run). Only count the delete as complete when both sides
  // succeed — same pattern as the cleanup cron.
  if (doc.storage_path) {
    const { error: rmErr } = await supabase.storage
      .from("user-documents")
      .remove([doc.storage_path]);

    const storageOk = !rmErr || /not.?found/i.test(rmErr.message ?? "");
    if (!storageOk) {
      logger.error({ err: rmErr, docId: doc.id, path: doc.storage_path }, "Storage remove failed during document delete");
      return NextResponse.json({ error: "Failed to delete document files" }, { status: 500 });
    }
  }

  const { error: delErr } = await supabase
    .from("user_documents")
    .delete()
    .eq("id", doc.id);

  if (delErr) {
    logger.error({ err: delErr, docId: doc.id }, "DB delete failed after storage remove — storage may be orphaned");
    return NextResponse.json({ error: "Failed to delete document record" }, { status: 500 });
  }

  logger.info({ docId: doc.id, userId: user.id }, "Document deleted");
  return NextResponse.json({ ok: true });
}
