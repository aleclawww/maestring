export const runtime = 'nodejs'

import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function GET() {
  const user = await requireAuthenticatedUser();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("user_documents")
    .select("id, filename, file_size, processing_status, chunk_count, created_at, error_message")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    logger.error({ err: error, userId: user.id }, "Failed to fetch user documents");
    return NextResponse.json({ error: "Failed to load documents" }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
