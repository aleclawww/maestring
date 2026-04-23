import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireAuthenticatedUser();
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("submit_exam_session", {
    p_user_id: user.id,
    p_session_id: params.id,
  });

  if (error) {
    logger.error({ err: error, userId: user.id, sessionId: params.id }, "submit_exam_session failed");
    return NextResponse.json({ error: error.message ?? "Failed to submit" }, { status: 500 });
  }

  return NextResponse.json({ data });
}
