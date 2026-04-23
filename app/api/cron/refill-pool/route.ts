import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateQuestion } from "@/lib/question-engine/generator";
import { logger } from "@/lib/logger";
import { runCron } from "@/lib/cron/run";

const MIN_POOL_SIZE = 10;
const QUESTIONS_PER_REFILL = 3;
const MAX_CONCEPTS_PER_RUN = 5;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const outcome = await runCron("refill-pool", async () => {
    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: needsRefill, error } = await supabase.rpc("concepts_needing_refill" as any, {
      p_min: MIN_POOL_SIZE,
    });
    if (error) throw new Error(`concepts_needing_refill failed: ${error.message}`);

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
            reviewStatus: "pending",
          });
          generated++;
        } catch (err) {
          failed++;
          logger.warn({ err, conceptId: t.concept_id }, "Refill generation failed");
        }
      }
    }

    return {
      status: "ok",
      rowsAffected: generated,
      metadata: { targets: targets.length, generated, failed },
    };
  });

  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 500 });
  return NextResponse.json(outcome.result);
}
