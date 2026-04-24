import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureConceptStatesExist } from "@/lib/question-engine/selector";
import { logger } from "@/lib/logger";
import { z } from "zod";

const CreateSessionSchema = z.object({
  mode: z.enum(["discovery", "review", "intensive", "maintenance", "exploration"]).default("review"),
  domainId: z.string().uuid().optional(),
  targetQuestions: z.number().int().min(5).max(30).default(10),
});

// GET — fetch active session (if any)
export async function GET() {
  const user = await requireAuthenticatedUser();
  const supabase = createAdminClient();

  const { data: session, error } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error({ error, userId: user.id }, "Failed to fetch active session");
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }

  return NextResponse.json({ data: session });
}

// POST — create new session
export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser();
  const supabase = createAdminClient();

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.format() }, { status: 400 });
  }

  const { mode, domainId, targetQuestions } = parsed.data;

  // Abandon any existing active session. Must succeed before we insert a new
  // one — otherwise the user ends up with two active sessions, which breaks
  // the single-active invariant the rest of the study loop assumes (GET
  // picks the latest "active" and the UI resumes against that). Silently
  // swallowing this error was causing phantom duplicate sessions in prod.
  const { error: abandonErr } = await supabase
    .from("study_sessions")
    .update({ status: "abandoned" })
    .eq("user_id", user.id)
    .eq("status", "active");

  if (abandonErr) {
    logger.error({ err: abandonErr, userId: user.id }, "Failed to abandon previous active session");
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  // Ensure concept states exist for the user. Previously this was a bare
  // `await` with no error handling; the helper also used to silently swallow
  // its own insert errors. Now that it throws on failure, catch here and
  // return a clean 500 so the client sees "Failed to create session" rather
  // than an unhandled server error — the user avoids dropping into an empty
  // study session with no concept states.
  try {
    await ensureConceptStatesExist(user.id);
  } catch (seedErr) {
    logger.error({ err: seedErr, userId: user.id }, "Failed to ensure concept states exist");
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  const { data: session, error } = await supabase
    .from("study_sessions")
    .insert({
      user_id: user.id,
      mode,
      domain_id: domainId ?? null,
      target_questions: targetQuestions,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    logger.error({ error, userId: user.id }, "Failed to create study session");
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  logger.info({ sessionId: session.id, userId: user.id, mode }, "Study session created");
  return NextResponse.json({ data: session }, { status: 201 });
}

// PATCH — complete a session
export async function PATCH(req: NextRequest) {
  const user = await requireAuthenticatedUser();
  const supabase = createAdminClient();

  const body = await req.json().catch(() => ({}));
  const sessionId = body.sessionId as string | undefined;

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  // Calculate stats
  const { data: attempts, error: attemptsErr } = await supabase
    .from("question_attempts")
    .select("is_correct, time_taken_ms")
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (attemptsErr) {
    // Silent failure here wrote 0/0/0 to study_sessions.questions_answered,
    // correct_answers, total_time_seconds for the entire session — and the
    // streak bump trigger fires on status='completed' regardless, so the
    // user got credit but their lifetime stats quietly rolled back. Log
    // error so support tickets about "my streak says I studied but my
    // stats don't" have a trail to correlate against.
    logger.error(
      { err: attemptsErr, sessionId, userId: user.id },
      "Failed to aggregate question_attempts for session complete — stats will be zero"
    );
  }

  const total = attempts?.length ?? 0;
  const correct = attempts?.filter((a) => a.is_correct).length ?? 0;
  const avgTime = total > 0
    ? Math.round(attempts!.reduce((sum, a) => sum + (a.time_taken_ms ?? 0), 0) / total)
    : 0;

  const { error } = await supabase
    .from("study_sessions")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
      questions_answered: total,
      correct_answers: correct,
      total_time_seconds: Math.round((avgTime * total) / 1000),
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    logger.error({ error, sessionId }, "Failed to complete session");
    return NextResponse.json({ error: "Failed to complete session" }, { status: 500 });
  }

  return NextResponse.json({ data: { success: true, stats: { total, correct, avgTime } } });
}

// DELETE — abandon session
export async function DELETE(req: NextRequest) {
  const user = await requireAuthenticatedUser();
  const supabase = createAdminClient();

  // Accept sessionId from body or query for fetch DELETE compatibility
  const body = await req.json().catch(() => ({}));
  const sessionId =
    (body.sessionId as string | undefined) ?? req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("study_sessions")
    .update({ status: "abandoned" })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    logger.error({ err: error, sessionId, userId: user.id }, "Failed to abandon session");
    return NextResponse.json({ error: "Failed to abandon session" }, { status: 500 });
  }

  return NextResponse.json({ data: { success: true } });
}
