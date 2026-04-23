import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateAnswerLocal } from "@/lib/question-engine/generator";
import { scheduleReview, answerToRating } from "@/lib/fsrs";
import { logger } from "@/lib/logger";
import { z } from "zod";

// Client sends only what it knows; server is the source of truth for
// the question text, options, and correct index.
const EvaluateSchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  conceptId: z.string().uuid(),
  selectedIndex: z.number().int().min(0).max(3),
  timeTakenMs: z.number().int().positive(),
  // Progressive-hint flow: user may submit a correct answer on the second
  // attempt. For FSRS purposes, that still counts as a lapse (Again). The
  // client tells us whether the first attempt was correct.
  firstAttemptCorrect: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser();

  const body = await req.json().catch(() => ({}));
  const parsed = EvaluateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.format() }, { status: 400 });
  }

  const { sessionId, questionId, conceptId, selectedIndex, timeTakenMs, firstAttemptCorrect } = parsed.data;
  const supabase = createAdminClient();

  const [
    { data: session },
    { data: question },
    { data: conceptState },
    { data: concept },
  ] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("id, questions_answered, correct_answers, mode")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("questions")
      .select("question_text, options, correct_index, explanation")
      .eq("id", questionId)
      .maybeSingle(),
    supabase.from("user_concept_states").select("*").eq("user_id", user.id).eq("concept_id", conceptId).maybeSingle(),
    supabase.from("concepts").select("id, name, difficulty").eq("id", conceptId).maybeSingle(),
  ]);

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const options = question.options as string[];
  const evaluation = evaluateAnswerLocal(
    options,
    question.correct_index,
    selectedIndex,
    question.explanation
  );

  const difficulty = concept?.difficulty ?? 0.5;
  // Only "correct on the first attempt" earns a non-Again rating. A second-try
  // correct is still a lapse — the user needed a hint to get here.
  const effectiveCorrect = evaluation.isCorrect && firstAttemptCorrect;
  const rating = answerToRating(effectiveCorrect, timeTakenMs, difficulty);

  // Pilar 3 — Modo Exploración: el usuario explora sin que sus respuestas
  // distorsionen el schedule FSRS. Saltamos el update de user_concept_states
  // y no derivamos un próximo review.
  const isExploration = (session as { mode?: string } | null)?.mode === "exploration";

  let nextReviewDate: string | null = null;
  if (conceptState && !isExploration) {
    const next = scheduleReview(conceptState as never, rating);
    const updates = next.nextState as Record<string, unknown>;
    nextReviewDate = (updates["next_review_date"] as string) ?? null;
    await supabase
      .from("user_concept_states")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ ...updates, last_rating: rating, updated_at: new Date().toISOString() } as any)
      .eq("user_id", user.id)
      .eq("concept_id", conceptId);
  }

  await supabase
    .from("question_attempts")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({
      session_id: sessionId,
      question_id: questionId,
      user_id: user.id,
      concept_id: conceptId,
      user_answer_index: selectedIndex,
      is_correct: effectiveCorrect,
      time_taken_ms: timeTakenMs,
      evaluation_result: {
        ...evaluation,
        fsrs_rating: rating,
        first_attempt_correct: firstAttemptCorrect,
      },
    } as any);

  await supabase
    .from("study_sessions")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({
      questions_answered: (session.questions_answered ?? 0) + 1,
      correct_answers: (session.correct_answers ?? 0) + (effectiveCorrect ? 1 : 0),
    } as any)
    .eq("id", sessionId);

  logger.info({ userId: user.id, conceptId, isCorrect: evaluation.isCorrect, rating }, "Answer evaluated");

  return NextResponse.json({
    data: { evaluation, rating, nextReviewDate, exploration: isExploration },
  });
}
