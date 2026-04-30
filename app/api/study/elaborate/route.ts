export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { elaborateAnswer } from "@/lib/question-engine/generator";
import { checkLlmRateLimit, rateLimitHeaders } from "@/lib/redis/rate-limit";
import { logger } from "@/lib/logger";
import { z } from "zod";

const Schema = z.object({
  questionId: z.string().uuid(),
  selectedIndex: z.number().int().min(0).max(3),
});

export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser();
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const rl = await checkLlmRateLimit(user.id);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  const supabase = createAdminClient();

  // Ownership gate: the user must have at least one attempt for this question.
  // Without this check any authenticated user could enumerate any question's
  // correct answer + explanation by calling elaborate on an unseen question_id.
  const { count: attemptCount, error: attemptErr } = await supabase
    .from("question_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("question_id", parsed.data.questionId);

  if (attemptErr) {
    logger.error({ err: attemptErr, questionId: parsed.data.questionId, userId: user.id }, "elaborate: ownership check failed");
    return NextResponse.json({ error: "Failed to verify question ownership" }, { status: 500 });
  }
  if (!attemptCount || attemptCount === 0) {
    // Return 404 rather than 403 to avoid confirming that the question ID exists.
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const { data: question, error: qErr } = await supabase
    .from("questions")
    .select("question_text, options, correct_index, explanation")
    .eq("id", parsed.data.questionId)
    .maybeSingle();

  if (qErr) {
    logger.error(
      { err: qErr, questionId: parsed.data.questionId, userId: user.id },
      "Failed to load question for elaborate"
    );
    return NextResponse.json({ error: "Failed to load question" }, { status: 500 });
  }

  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const result = await elaborateAnswer(
    question.question_text,
    question.options as string[],
    question.correct_index,
    parsed.data.selectedIndex,
    question.explanation,
    user.id
  );

  return NextResponse.json({ data: result }, { headers: rateLimitHeaders(rl) });
}
