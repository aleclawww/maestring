import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const Body = z.object({
  displayName: z.string().trim().min(2).max(60),
  role: z.string().trim().max(60).nullable().optional(),
  content: z.string().trim().min(20).max(500),
  stars: z.number().int().min(1).max(5).default(5),
  examPassed: z.boolean().optional(),
  scaledScore: z.number().int().min(100).max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser();
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.format() }, { status: 400 });
  }

  const supabase = createAdminClient();

  // One submission per user per rolling 7d window (anti-spam).
  //
  // Silent-swallow note: this select previously dropped the error side,
  // which would fail-open the 7-day guard on any DB/RLS hiccup — a user
  // could spam testimonials if the check query broke. We still fail
  // open (blocking all submissions on a transient error is worse than
  // tolerating occasional duplicates), but we log so the operator sees
  // "spam guard bypassed" signal alongside a duplicate-testimonials
  // spike.
  const { data: existing, error: existingErr } = await supabase
    .from("testimonials")
    .select("id, status, submitted_at")
    .eq("user_id", user.id)
    .gte("submitted_at", new Date(Date.now() - 7 * 864e5).toISOString())
    .limit(1)
    .maybeSingle();

  if (existingErr) {
    logger.warn(
      { err: existingErr, userId: user.id },
      "testimonials 7d-window check failed — proceeding fail-open (spam guard temporarily bypassed)"
    );
  }

  if (existing) {
    return NextResponse.json(
      { error: "already_submitted", message: "Ya enviaste un testimonio esta semana. Espera unos días." },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("testimonials")
    .insert({
      user_id: user.id,
      display_name: parsed.data.displayName,
      role: parsed.data.role ?? null,
      content: parsed.data.content,
      stars: parsed.data.stars,
      exam_passed: parsed.data.examPassed ?? null,
      scaled_score: parsed.data.scaledScore ?? null,
    })
    .select("id, status")
    .single();

  if (error) {
    // Insert failure was previously only visible to the user as a
    // generic 500 — no log trace of which testimonial or why. That
    // made "my review didn't submit" support tickets unreproducible.
    // Log the full error so schema/RLS regressions surface.
    logger.error(
      { err: error, userId: user.id },
      "testimonial insert failed"
    );
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }

  return NextResponse.json({ data });
}
