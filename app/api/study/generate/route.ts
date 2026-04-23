import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateQuestion } from "@/lib/question-engine/generator";
import { buildStudyQueue, getRecentMistakes } from "@/lib/question-engine/selector";
import { checkLlmRateLimit, rateLimitHeaders } from "@/lib/redis/rate-limit";
import { logger } from "@/lib/logger";
import { z } from "zod";

const RequestSchema = z.object({
  sessionId: z.string().uuid(),
  mode: z.enum(["discovery", "review", "intensive", "maintenance", "exploration"]).default("review"),
});

export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser();

  const body = await req.json().catch(() => ({}));
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.format() }, { status: 400 });
  }

  const { sessionId, mode } = parsed.data;
  const supabase = createAdminClient();

  const [{ data: session }, { data: profile }] = await Promise.all([
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

  if (!session || session.status !== "active") {
    return NextResponse.json({ error: "Session not found or inactive" }, { status: 404 });
  }

  const sessionMode = (session.mode ?? mode) as "discovery" | "review" | "intensive" | "maintenance" | "exploration";
  // Exploration mode is treated as discovery for selection (broad sampling) but
  // the evaluator skips the FSRS update — see app/api/study/evaluate/route.ts.
  const selectionMode = sessionMode === "exploration" ? "discovery" : sessionMode;
  const domainId = (session as { domain_id?: string | null }).domain_id ?? undefined;

  const [queue, recentMistakes] = await Promise.all([
    buildStudyQueue(user.id, selectionMode, domainId ?? undefined),
    getRecentMistakes(user.id, 5),
  ]);

  if (queue.length === 0) {
    return NextResponse.json({ data: null, message: "No more questions due" });
  }

  const next = queue[0]!;

  // POOL-FIRST: try a previously-generated unseen question for this user.
  // Zero LLM calls, zero quota consumed, sub-100ms latency.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const poolRes = await supabase.rpc("pick_pool_question" as any, {
    p_user_id: user.id,
    p_concept_id: next.conceptId,
  });
  const pooled = Array.isArray(poolRes.data) ? poolRes.data[0] : null;
  if (pooled) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.rpc("bump_question_shown" as any, { p_question_id: pooled.id });
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
      },
      metadata: {
        conceptId: next.conceptId,
        conceptName: next.conceptName,
        priority: next.priority,
        queueRemaining: queue.length - 1,
        source: "pool",
      },
    });
  }

  // POOL MISS: fall back to live LLM generation. Only here do we charge
  // rate-limit + daily quota.
  const rl = await checkLlmRateLimit(user.id);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before generating more questions." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quotaRes = await supabase.rpc("consume_llm_quota" as any, { p_user_id: user.id });
  const quotaRow = Array.isArray(quotaRes.data) ? quotaRes.data[0] : null;
  if (quotaRow && quotaRow.allowed === false) {
    return NextResponse.json(
      {
        error: "daily_quota_exceeded",
        message: `Llegaste al tope diario del plan ${quotaRow.plan} (${quotaRow.quota} preguntas). Vuelve mañana o pasa a Pro para ilimitado.`,
        quota: quotaRow.quota,
        used: quotaRow.used,
        plan: quotaRow.plan,
      },
      { status: 402 }
    );
  }

  try {
    const fingerprint = (profile as { cognitive_fingerprint?: Record<string, unknown> } | null)
      ?.cognitive_fingerprint as
      | { background?: 'developer' | 'sysadmin' | 'business' | 'student' | 'other'; explanation_depth?: 'deep' | 'concise'; weakness_pattern?: string }
      | undefined;

    const question = await generateQuestion({
      conceptSlug: next.conceptSlug,
      conceptId: next.conceptId,
      difficulty: next.difficulty,
      recentMistakes,
      mode: selectionMode,
      fingerprint,
    });

    logger.info(
      { userId: user.id, conceptId: next.conceptId, sessionId },
      "Question generated"
    );

    return NextResponse.json(
      {
        data: question,
        metadata: {
          conceptId: next.conceptId,
          conceptName: next.conceptName,
          priority: next.priority,
          queueRemaining: queue.length - 1,
          source: "generated",
        },
      },
      { headers: rateLimitHeaders(rl) }
    );
  } catch (err) {
    logger.error({ err, conceptId: next.conceptId }, "Question generation failed");
    return NextResponse.json({ error: "Failed to generate question" }, { status: 500 });
  }
}
