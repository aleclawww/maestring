export const runtime = 'nodejs'

import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireAuthenticatedUser();
  const supabase = createAdminClient();

  const { data: session, error } = await supabase
    .from("exam_sessions")
    .select("id, user_id, status, started_at, deadline_at, submitted_at, total_questions, correct_count, scaled_score, passed, by_domain")
    .eq("id", params.id)
    .maybeSingle();

  // Previously this collapsed three different conditions into a single 404:
  //   (a) DB read error (RLS/PG blip),
  //   (b) genuinely-missing row (real 404),
  //   (c) row belongs to a different user (404 for opacity).
  // A DB error mid-exam looked identical to "your exam was deleted" — the
  // user would lose trust that their submitted-but-not-yet-loaded test
  // still existed. Distinguish (a) with a truthful 500 + logger.error, and
  // keep (b)/(c) collapsed into 404 for security (don't leak existence of
  // other users' sessions).
  if (error) {
    logger.error(
      { err: error, sessionId: params.id, userId: user.id },
      "Failed to load exam_sessions row — returning 500 (was previously collapsed to a misleading 404 'Not found')"
    );
    return NextResponse.json({ error: "Failed to load exam session" }, { status: 500 });
  }
  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Silent-swallow previously: a failed items select rendered as an empty
  // exam. An in-progress test looks the same as a fully missing test — the
  // user can't continue and support can't reproduce "my exam disappeared".
  // Fail loud (500) so the client can surface a real error instead of
  // rendering a ghost exam.
  const { data: items, error: itemsErr } = await supabase
    .from("exam_session_items")
    .select("position, user_answer_index, flagged, answered_at, is_correct, question_id, questions(id, question_text, options, difficulty, correct_index, explanation, concept_id, concepts(id, slug, name, domain_id, knowledge_domains(id, slug, name)))")
    .eq("session_id", params.id)
    .order("position", { ascending: true });

  if (itemsErr) {
    logger.error(
      { err: itemsErr, sessionId: params.id, userId: user.id },
      "Failed to load exam_session_items — returning 500 instead of empty exam"
    );
    return NextResponse.json({ error: "Failed to load exam items" }, { status: 500 });
  }

  const isSubmitted = session.status !== "in_progress";

  const sanitized = (items ?? []).map((it) => {
    const q = (it as unknown as { questions: { id: string; question_text: string; options: string[]; difficulty: string; correct_index: number; explanation: string; concepts?: { slug: string; name: string; knowledge_domains?: { slug: string; name: string } } } }).questions;
    return {
      position: it.position,
      user_answer_index: it.user_answer_index,
      flagged: it.flagged,
      answered_at: it.answered_at,
      is_correct: isSubmitted ? it.is_correct : null,
      question: {
        id: q.id,
        question_text: q.question_text,
        options: q.options,
        difficulty: q.difficulty,
        concept_slug: q.concepts?.slug ?? null,
        concept_name: q.concepts?.name ?? null,
        domain_slug: q.concepts?.knowledge_domains?.slug ?? null,
        domain_name: q.concepts?.knowledge_domains?.name ?? null,
        correct_index: isSubmitted ? q.correct_index : null,
        explanation: isSubmitted ? q.explanation : null,
      },
    };
  });

  return NextResponse.json({ data: { session, items: sanitized } });
}
