import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireAuthenticatedUser();
  const supabase = createAdminClient();

  const { data: session, error } = await supabase
    .from("exam_sessions")
    .select("id, user_id, status, started_at, deadline_at, submitted_at, total_questions, correct_count, scaled_score, passed, by_domain")
    .eq("id", params.id)
    .single();

  if (error || !session || session.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: items } = await supabase
    .from("exam_session_items")
    .select("position, user_answer_index, flagged, answered_at, is_correct, question_id, questions(id, question_text, options, difficulty, correct_index, explanation, concept_id, concepts(id, slug, name, domain_id, knowledge_domains(id, slug, name)))")
    .eq("session_id", params.id)
    .order("position", { ascending: true });

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
