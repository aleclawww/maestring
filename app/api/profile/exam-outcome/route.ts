export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { z } from "zod";

const BodySchema = z.object({
  outcome: z.enum(["passed", "failed", "unknown"]),
  // Optional self-reported scaled score (AWS reports 100–1000) — feeds the
  // P(aprobar) calibrator once we have ≥500 outcomes (Pilar 1 maduro).
  scaled_score: z.number().int().min(100).max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser();
  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { outcome, scaled_score } = parsed.data;
  const supabase = createAdminClient();

  // Persist outcome on profile. journey_phase derivation runs on next read via
  // compute_journey_phase — we set post_cert proactively so the dashboard
  // adapts immediately instead of waiting for the cron.
  const update: Record<string, unknown> = {
    exam_outcome: outcome,
    journey_phase: "post_cert",
  };
  if (typeof scaled_score === "number") {
    update["exam_scaled_score"] = scaled_score;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("profiles").update(update as any).eq("id", user.id);
  if (error) {
    logger.error({ err: error, userId: user.id }, "Failed to persist exam outcome");
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  logger.info({ userId: user.id, outcome }, "Exam outcome captured");
  return NextResponse.json({ data: { outcome } });
}
