import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateQuestion } from "@/lib/question-engine/generator";
import { logger } from "@/lib/logger";

const MIN_POOL_SIZE = 10;
const QUESTIONS_PER_REFILL = 3;
const MAX_CONCEPTS_PER_RUN = 5;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: needsRefill, error } = await supabase.rpc("concepts_needing_refill" as any, {
    p_min: MIN_POOL_SIZE,
  });

  if (error) {
    logger.error({ error }, "concepts_needing_refill failed");
    return NextResponse.json({ error: "RPC failed" }, { status: 500 });
  }

  const targets = (needsRefill ?? []).slice(0, MAX_CONCEPTS_PER_RUN) as Array<{
    concept_id: string;
    pool_size: number;
  }>;

  let generated = 0;
  let failed = 0;

  for (const t of targets) {
    const { data: concept } = await supabase
      .from("concepts")
      .select("slug")
      .eq("id", t.concept_id)
      .maybeSingle();

    if (!concept?.slug) continue;

    for (let i = 0; i < QUESTIONS_PER_REFILL; i++) {
      try {
        await generateQuestion({
          conceptSlug: concept.slug,
          conceptId: t.concept_id,
          mode: "review",
        });
        generated++;
      } catch (err) {
        failed++;
        logger.warn({ err, conceptId: t.concept_id }, "Refill generation failed");
      }
    }
  }

  logger.info({ targets: targets.length, generated, failed }, "Pool refill complete");

  return NextResponse.json({
    targetsProcessed: targets.length,
    questionsGenerated: generated,
    failures: failed,
  });
}
