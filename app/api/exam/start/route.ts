export const runtime = 'nodejs'

import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function POST() {
  const user = await requireAuthenticatedUser();
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sessionId, error } = await (supabase.rpc as any)("start_exam_session", {
    p_user_id: user.id,
    p_certification_id: "aws-saa-c03",
    p_total: 65,
    p_duration_minutes: 130,
  });

  if (error || !sessionId) {
    logger.error({ err: error, userId: user.id }, "start_exam_session failed");
    return NextResponse.json({ error: "Failed to start exam" }, { status: 500 });
  }

  const { data: session, error: sessionErr } = await supabase
    .from("exam_sessions")
    .select("id, deadline_at, started_at, total_questions, status")
    .eq("id", sessionId as string)
    .single();

  if (sessionErr || !session) {
    logger.error({ err: sessionErr, sessionId }, "Failed to read newly-created exam session");
    return NextResponse.json({ error: "Failed to start exam" }, { status: 500 });
  }

  // If the pool was too thin and we created a session with 0 items, roll it back.
  const { count, error: countErr } = await supabase
    .from("exam_session_items")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId as string);

  if (countErr) {
    logger.error({ err: countErr, sessionId }, "Failed to count exam session items");
    return NextResponse.json({ error: "Failed to start exam" }, { status: 500 });
  }

  if (!count || count === 0) {
    // Roll back the empty session. If the delete itself fails we MUST surface
    // it — otherwise we leave an orphan `exam_sessions` row with zero items
    // that the user sees in history as a broken exam. Previously this was
    // `await ...delete()` with no error check.
    const { error: rollbackErr } = await supabase
      .from("exam_sessions")
      .delete()
      .eq("id", sessionId as string);
    if (rollbackErr) {
      logger.error(
        { err: rollbackErr, sessionId, userId: user.id },
        "Failed to roll back empty exam session — orphan row left in exam_sessions"
      );
      // Still return 409 so the user's UI shows the correct "not enough
      // questions" message; the orphan is a bookkeeping problem we can see
      // in logs and clean up via cron if it recurs.
    }
    return NextResponse.json(
      { error: "insufficient_question_pool", message: "Not enough questions in the pool for a full mock exam. Study more topics first." },
      { status: 409 }
    );
  }

  return NextResponse.json({ data: { ...session, item_count: count } });
}
