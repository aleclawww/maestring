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

  // All four reads were collapsing `{ data, error }` into just `{ data }`, so
  // an RLS/DB read error on `session` or `question` fell through to the
  // `if (!X)` guards below and returned a 404 that LIED about the cause:
  // the client got "Session not found" / "Question not found" when the
  // real issue was a transient read failure. On retry the client hits the
  // same failure, and any "my study session is broken" ticket is
  // untraceable from logs. Fix by capturing the full result objects,
  // distinguishing read errors (500 with a truthful error code) from
  // genuinely-missing rows (404 as before), and logging loudly.
  const [sessionRes, questionRes, conceptStateRes, conceptRes] = await Promise.all([
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

  if (sessionRes.error) {
    logger.error(
      { err: sessionRes.error, userId: user.id, sessionId },
      "evaluate: study_sessions read failed — returning 500 (was previously collapsed to a misleading 404 'Session not found')"
    );
    return NextResponse.json({ error: "session_read_failed" }, { status: 500 });
  }
  if (questionRes.error) {
    logger.error(
      { err: questionRes.error, userId: user.id, questionId },
      "evaluate: questions read failed — returning 500 (was previously collapsed to a misleading 404 'Question not found')"
    );
    return NextResponse.json({ error: "question_read_failed" }, { status: 500 });
  }
  // These two are soft degrades: the evaluate path tolerates missing
  // conceptState (skips FSRS advance) and missing concept (difficulty
  // defaults to 0.5 in answerToRating). Silent failure used to make a
  // broken read look like a first-attempt-on-new-concept, which quietly
  // shifted FSRS behavior. Warn so a spike in these matters to ops but
  // doesn't 500 the user's answer.
  if (conceptStateRes.error) {
    logger.warn(
      { err: conceptStateRes.error, userId: user.id, conceptId, sessionId },
      "evaluate: user_concept_states read failed — FSRS advance will be skipped for this attempt, schedule may drift"
    );
  }
  if (conceptRes.error) {
    logger.warn(
      { err: conceptRes.error, userId: user.id, conceptId },
      "evaluate: concepts read failed — difficulty defaults to 0.5, FSRS rating slightly miscalibrated for this attempt"
    );
  }

  const session = sessionRes.data;
  const question = questionRes.data;
  const conceptState = conceptStateRes.data;
  const concept = conceptRes.data;

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

  // --------------------------------------------------------------------------
  // Idempotency boundary.
  //
  // The migration 032 UNIQUE (session_id, question_id) lets us use the
  // question_attempts row as the idempotency token. We insert first:
  //   * race-winner: insert succeeds, we proceed with the FSRS schedule +
  //     session counter updates exactly once.
  //   * race-loser (double-click, retry after network blip): insert fails
  //     with 23505; we read the winner's attempt back and return the same
  //     evaluation — no double-update of user_concept_states (which would
  //     drift the schedule) and no double-increment of questions_answered.
  // --------------------------------------------------------------------------
  const { error: insertErr } = await supabase
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

  if (insertErr) {
    if ((insertErr as { code?: string }).code === "23505") {
      // Duplicate submission — replay the canonical evaluation we already
      // stored, without re-advancing FSRS state or session counters.
      // Silent failure here made us fall through to `existing = null` and
      // return the current-request `evaluation` as if it were the canonical
      // one — so a duplicate submission that hit a read failure would return
      // a fresh eval that DISAGREES with the row already in question_attempts
      // (because evaluation_result captures `first_attempt_correct` and the
      // client's selectedIndex may differ on retry). Log warn so we can see
      // when the duplicate-replay fallback drifts from the stored truth.
      const { data: existing, error: existingErr } = await supabase
        .from("question_attempts")
        .select("evaluation_result, is_correct")
        .eq("session_id", sessionId)
        .eq("question_id", questionId)
        .maybeSingle();
      if (existingErr) {
        logger.warn(
          { err: existingErr, userId: user.id, sessionId, questionId },
          "Duplicate evaluate — failed to read prior attempt; returning current-request eval (may differ from stored)"
        );
      }

      const existingEval =
        (existing?.evaluation_result as Record<string, unknown> | null) ?? null;
      logger.info(
        { userId: user.id, sessionId, questionId },
        "Duplicate evaluate request — returning cached attempt"
      );
      return NextResponse.json({
        data: {
          evaluation: existingEval ?? evaluation,
          rating: (existingEval?.["fsrs_rating"] as number | undefined) ?? rating,
          nextReviewDate: null,
          exploration: isExploration,
          duplicate: true,
        },
      });
    }
    logger.error({ err: insertErr, userId: user.id, sessionId, questionId }, "Failed to record question attempt");
    return NextResponse.json({ error: "Failed to record attempt" }, { status: 500 });
  }

  // Winner path: advance FSRS + bump session counters exactly once.
  let nextReviewDate: string | null = null;
  if (conceptState && !isExploration) {
    const next = scheduleReview(conceptState as never, rating);
    const updates = next.nextState as Record<string, unknown>;
    nextReviewDate = (updates["next_review_date"] as string) ?? null;
    // FSRS schedule advance. A silent failure here is the worst kind of
    // silent swallow: the question_attempts row is already inserted, so a
    // client retry hits the duplicate path at L108 and does NOT re-run
    // this update. That means `user_concept_states.next_review_date` is
    // frozen in yesterday's window while the attempts table keeps growing
    // — every subsequent due-queue build will keep surfacing the same
    // concept because its schedule never moved. Log loudly so we can
    // correlate "user stuck on concept X" to a concrete update error.
    // Don't throw/return 500: the retry-into-duplicate-path wouldn't fix
    // this anyway, and we'd push the client into a failure state the
    // server can't recover from. Loud log + graceful continue is correct.
    const { error: fsrsUpdateErr } = await supabase
      .from("user_concept_states")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ ...updates, last_rating: rating, updated_at: new Date().toISOString() } as any)
      .eq("user_id", user.id)
      .eq("concept_id", conceptId);
    if (fsrsUpdateErr) {
      logger.error(
        { err: fsrsUpdateErr, userId: user.id, conceptId, sessionId, rating },
        "FSRS schedule update failed — user_concept_states frozen, concept will keep resurfacing in due queue"
      );
    }
  }

  // Bump session counters. Same severity as the FSRS update: the attempt
  // is already recorded, so a retry goes to the duplicate path and does
  // NOT re-bump. A silent failure here leaves the session header stuck
  // behind the attempts count — the user sees wrong progress in the UI
  // and any "session complete at N questions" trigger may never fire.
  // Log so operators can correlate a stuck-progress ticket to a concrete
  // update error.
  const { error: sessionCountErr } = await supabase
    .from("study_sessions")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({
      questions_answered: (session.questions_answered ?? 0) + 1,
      correct_answers: (session.correct_answers ?? 0) + (effectiveCorrect ? 1 : 0),
    } as any)
    .eq("id", sessionId);
  if (sessionCountErr) {
    logger.error(
      { err: sessionCountErr, userId: user.id, sessionId, conceptId },
      "study_sessions counter update failed — questions_answered/correct_answers will drift from question_attempts"
    );
  }

  logger.info({ userId: user.id, conceptId, isCorrect: evaluation.isCorrect, rating }, "Answer evaluated");

  return NextResponse.json({
    data: { evaluation, rating, nextReviewDate, exploration: isExploration },
  });
}
