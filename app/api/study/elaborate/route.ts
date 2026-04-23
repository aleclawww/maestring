import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { elaborateAnswer } from "@/lib/question-engine/generator";
import { checkLlmRateLimit, rateLimitHeaders } from "@/lib/redis/rate-limit";
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
  const { data: question } = await supabase
    .from("questions")
    .select("question_text, options, correct_index, explanation")
    .eq("id", parsed.data.questionId)
    .maybeSingle();

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
