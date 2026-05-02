export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateQuestionStatic } from "@/lib/question-engine/static-generator";
import { CONCEPTS } from "@/lib/knowledge-graph/aws-saa";
import { buildStudyQueue, getRecentMistakes } from "@/lib/question-engine/selector";
import { getEntitlement } from "@/lib/subscription/check";
import { logger } from "@/lib/logger";
import { z } from "zod";

const RequestSchema = z.object({
  sessionId: z.string().uuid(),
  mode: z.enum(["discovery", "review", "intensive", "maintenance", "exploration"]).default("review"),
});

export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser();

  // Engagement-gated trial: block question generation when the free preview
  // is exhausted and the user hasn't started a trial yet. Returns 402 with
  // a paywall hint the client surfaces as a "Start trial" overlay.
  const ent = await getEntitlement(user.id);
  if (ent.kind === 'gated') {
    return NextResponse.json(
      { error: 'preview_exhausted', message: 'Free preview used. Start your 7-day trial to keep going.', paywall: true },
      { status: 402 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.format() }, { status: 400 });
  }

  const { sessionId, mode } = parsed.data;
  const supabase = createAdminClient();

  // Same silent-swallow pattern PR #39 fixed in /api/study/evaluate. The
  // earlier shape `const [{ data: session }, { data: profile }] = await
  // Promise.all([...])` dropped `error` off both PostgREST results. A DB
  // read failure (RLS regression, network blip, Postgres hiccup) would
  // leave `session` null and collapse into the 404 branch below, lying
  // to the user with "Session not found or inactive" when the session
  // actually exists and the DB is the problem. Capture full result
  // objects and distinguish read errors (500 + truthful code) from
  // genuinely-missing rows (404 as before). Profile is a soft degrade —
  // a read failure just means the prompt loses fingerprint
  // personalization; warn but continue.
  const [sessionRes, profileRes] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("id, status, mode, domain_id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("profiles")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("cognitive_fingerprint" as any)
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (sessionRes.error && sessionRes.error.code !== "PGRST116") {
    // PGRST116 = "no rows returned" from .single() — that's a genuine
    // 404. Any other code is a real read failure.
    logger.error(
      { err: sessionRes.error, userId: user.id, sessionId },
      "generate: study_sessions read failed — returning 500 (was previously collapsed to a misleading 404 'Session not found or inactive')"
    );
    return NextResponse.json({ error: "session_read_failed" }, { status: 500 });
  }
  if (profileRes.error) {
    logger.warn(
      { err: profileRes.error, userId: user.id },
      "generate: profiles read failed — proceeding without cognitive_fingerprint (prompt loses personalization)"
    );
  }
  const session = sessionRes.data;
  const profile = profileRes.data;

  if (!session || session.status !== "active") {
    return NextResponse.json({ error: "Session not found or inactive" }, { status: 404 });
  }

  const sessionMode = (session.mode ?? mode) as "discovery" | "review" | "intensive" | "maintenance" | "exploration";
  // Exploration mode is treated as discovery for selection (broad sampling) but
  // the evaluator skips the FSRS update — see app/api/study/evaluate/route.ts.
  const selectionMode = sessionMode === "exploration" ? "discovery" : sessionMode;
  const domainId = (session as { domain_id?: string | null }).domain_id ?? undefined;

  // Fetch session context: seen blueprint tasks + pattern tags for diversity ranking.
  const [queue, recentMistakes, sessionAttemptsRes] = await Promise.all([
    buildStudyQueue(user.id, selectionMode, domainId ?? undefined),
    getRecentMistakes(user.id, 5),
    supabase
      .from("question_attempts")
      .select("questions!inner(blueprint_task_id, pattern_tag)")
      .eq("session_id", sessionId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const sessionAttempts = (sessionAttemptsRes.data ?? []) as unknown as Array<{
    questions: { blueprint_task_id: string | null; pattern_tag: string | null };
  }>;
  const seenTasks = [...new Set(
    sessionAttempts.map(a => a.questions?.blueprint_task_id).filter(Boolean) as string[]
  )];
  const seenPatterns = [...new Set(
    sessionAttempts.map(a => a.questions?.pattern_tag).filter(Boolean) as string[]
  )];

  if (queue.length === 0) {
    // Return a distinct 409 so the client can show a targeted message instead
    // of the generic "Question data was invalid" it gets from a 200 with null
    // data. The selector already applies mode-aware fallbacks, so this path
    // only triggers when the user genuinely has nothing studyable right now
    // (e.g. all concepts mastered with next review in the future).
    return NextResponse.json(
      {
        error: "no_questions_for_mode",
        message:
          "No questions available for this mode right now. Switch to Review to continue.",
      },
      { status: 409 }
    );
  }

  const next = queue[0]!;

  // POOL-FIRST: try a previously-generated unseen question for this user.
  // Zero LLM calls, zero quota consumed, sub-100ms latency.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const poolRes = await supabase.rpc("pick_pool_question" as any, {
    p_user_id: user.id,
    p_concept_id: next.conceptId,
    p_seen_tasks: seenTasks,
    p_seen_patterns: seenPatterns,
  });
  // If the pool RPC errored we fall through to LLM generation (fail-open —
  // the user still gets a question). Previously this was silent, which
  // hid schema / RLS regressions behind a mysterious spike in LLM spend.
  // Log loudly so the "pool pick broken" signal surfaces next to the
  // Haiku-cost graph.
  if (poolRes.error) {
    logger.warn(
      { err: poolRes.error, userId: user.id, conceptId: next.conceptId },
      "pick_pool_question failed — falling through to LLM generation"
    );
  }
  const pooled = Array.isArray(poolRes.data) ? poolRes.data[0] : null;
  if (pooled) {
    // bump_question_shown tracks which user has already seen a pool question
    // so `pick_pool_question` filters it out next time. A silent drop here
    // means the same question could be re-served to the same user. Log but
    // don't throw — the question is already rendering.
    const { error: bumpErr } = await supabase.rpc(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "bump_question_shown" as any,
      { p_question_id: pooled.id }
    );
    if (bumpErr) {
      logger.warn(
        { err: bumpErr, userId: user.id, questionId: pooled.id, conceptId: next.conceptId },
        "bump_question_shown failed — pool hygiene degraded, question may re-serve"
      );
    }
    return NextResponse.json({
      data: {
        id: pooled.id,
        conceptId: next.conceptId,
        conceptName: next.conceptName,
        conceptSlug: next.conceptSlug,
        domainId: "",
        questionText: pooled.question_text,
        options: pooled.options as string[],
        correctIndex: pooled.correct_index,
        explanation: pooled.explanation,
        difficulty: pooled.difficulty,
        questionType: pooled.question_type,
        hint: pooled.hint ?? null,
        explanationDeep: pooled.explanation_deep ?? null,
        keyInsight: pooled.key_insight ?? null,
        scenarioContext: pooled.scenario_context ?? null,
        tags: pooled.tags ?? [],
        blueprintTaskId: pooled.blueprint_task_id ?? null,
        patternTag: pooled.pattern_tag ?? null,
        isCanonical: pooled.is_canonical ?? false,
      },
      metadata: {
        conceptId: next.conceptId,
        conceptName: next.conceptName,
        priority: next.priority,
        queueRemaining: queue.length - 1,
        source: "pool",
        blueprintTaskId: pooled.blueprint_task_id ?? null,
        patternTag: pooled.pattern_tag ?? null,
      },
    });
  }

  // ── POOL MISS — generate a question ──────────────────────────────────────
  //
  // Generation strategy (in order of priority):
  //
  //   1. STATIC generator  — always works, no API key needed, deterministic.
  //      Uses keyFacts / examTips / confusedWith from the knowledge graph to
  //      produce diverse MCQ questions. Zero cost, zero latency hit.
  //
  //   2. LLM (Claude Haiku) — only attempted when ANTHROPIC_API_KEY is
  //      configured. Uses the same quota + rate-limit path as before.
  //      LLM output is saved to the questions table and will be served
  //      from the pool on the next request for this concept.
  //
  // Both paths save the generated question to the DB so the pool fills over
  // time and pick_pool_question can serve it next time (zero-cost path).

  // Resolve the concept from the knowledge graph for static generation.
  const conceptDef = CONCEPTS.find(c => c.slug === next.conceptSlug);

  if (conceptDef) {
    // ── Path 1: Static generation (no LLM, no API key) ──────────────────
    //
    // Truly randomized seed per question. The previous formula
    // `filter(blueprint_task_id===conceptId).length + day_number` was
    // effectively constant within a day (the filter always returned 0
    // because blueprint_task_id and conceptId are different fields), which
    // pinned every question of the day to the same generator type, the same
    // exam tip, and — combined with the position math — the same option
    // letter. Using a hashed mix of the timestamp + a random component gives
    // genuine variety on every call.
    const staticSeed =
      (Date.now() & 0x7fffffff) ^ ((Math.random() * 0x7fffffff) | 0);

    const staticQ = generateQuestionStatic(conceptDef, staticSeed);

    // Save to the questions table SYNCHRONOUSLY. The returned row id is the
    // one we send to the client and is what /api/study/evaluate looks up.
    // Previous fire-and-forget + crypto.randomUUID() returned an id that
    // didn't exist in the DB, so evaluate would 404 ("Question not found")
    // and the client showed "session was reset" the moment the user answered.
    const insertPayload = {
      concept_id: next.conceptId,
      question_text: staticQ.questionText,
      options: staticQ.options,
      correct_index: staticQ.correctIndex,
      explanation: staticQ.explanation,
      difficulty: staticQ.difficulty,
      question_type: 'multiple_choice',
      source: 'static',
      review_status: 'approved',
      pattern_tag: staticQ.patternTag ?? null,
      is_canonical: false,
    };
    let savedQuestionId: string | null = null;
    const { data: savedRow, error: saveErr } = await supabase
      .from("questions")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(insertPayload as any)
      .select("id")
      .single();
    if (saveErr) {
      const code = (saveErr as { code?: string }).code;
      if (code === '23505') {
        // Unique violation — an identical question already exists. Look it up
        // by question_text + concept so we serve the canonical row's id.
        const { data: existing, error: lookupErr } = await supabase
          .from("questions")
          .select("id")
          .eq("concept_id", next.conceptId)
          .eq("question_text", staticQ.questionText)
          .maybeSingle();
        if (lookupErr || !existing) {
          logger.error(
            { err: lookupErr, conceptId: next.conceptId },
            "static-generator: insert hit 23505 but follow-up lookup failed"
          );
          return NextResponse.json({ error: "question_persist_failed" }, { status: 500 });
        }
        savedQuestionId = existing.id;
      } else {
        logger.error(
          { err: saveErr, conceptId: next.conceptId },
          "static-generator: failed to persist generated question — refusing to serve unpersisted question (would break evaluate)"
        );
        return NextResponse.json({ error: "question_persist_failed" }, { status: 500 });
      }
    } else {
      savedQuestionId = savedRow.id;
    }

    logger.info(
      { userId: user.id, conceptId: next.conceptId, sessionId, questionType: staticQ.questionType, questionId: savedQuestionId },
      "Static question generated"
    );

    const responseData = {
      id: savedQuestionId!,
      conceptId: next.conceptId,
      conceptName: next.conceptName,
      conceptSlug: next.conceptSlug,
      domainId: "",
      questionText: staticQ.questionText,
      options: staticQ.options,
      correctIndex: staticQ.correctIndex,
      explanation: staticQ.explanation,
      difficulty: staticQ.difficulty,
      questionType: staticQ.questionType,
      hint: null,
      explanationDeep: null,
      keyInsight: null,
      scenarioContext: null,
      tags: [] as string[],
      blueprintTaskId: null,
      patternTag: staticQ.patternTag ?? null,
      isCanonical: false,
    };

    return NextResponse.json({
      data: responseData,
      metadata: {
        conceptId: next.conceptId,
        conceptName: next.conceptName,
        priority: next.priority,
        queueRemaining: queue.length - 1,
        source: "static",
      },
    });
  }

  // No LLM fallback. The knowledge graph has full SAA-C03 coverage and the
  // pool is pre-filled. If we somehow land here it means a concept was added
  // to the DB but not to the local knowledge graph — fix the graph instead
  // of paying for an LLM fallback.
  logger.error(
    { userId: user.id, conceptSlug: next.conceptSlug, conceptId: next.conceptId },
    "generate: concept missing from knowledge graph — add it to lib/knowledge-graph/aws-saa.ts"
  );
  return NextResponse.json(
    { error: "concept_not_in_graph", conceptSlug: next.conceptSlug },
    { status: 500 }
  );
}
