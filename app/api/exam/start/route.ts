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

  const { data: session } = await supabase
    .from("exam_sessions")
    .select("id, deadline_at, started_at, total_questions, status")
    .eq("id", sessionId as string)
    .single();

  // If the pool was too thin and we created a session with 0 items, roll it back.
  const { count } = await supabase
    .from("exam_session_items")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId as string);

  if (!count || count === 0) {
    await supabase.from("exam_sessions").delete().eq("id", sessionId as string);
    return NextResponse.json(
      { error: "insufficient_question_pool", message: "No hay suficientes preguntas en el pool para un simulacro completo. Estudia más temas primero." },
      { status: 409 }
    );
  }

  return NextResponse.json({ data: { ...session, item_count: count } });
}
