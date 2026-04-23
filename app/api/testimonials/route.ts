import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const { data: existing } = await supabase
    .from("testimonials")
    .select("id, status, submitted_at")
    .eq("user_id", user.id)
    .gte("submitted_at", new Date(Date.now() - 7 * 864e5).toISOString())
    .limit(1)
    .maybeSingle();

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
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }

  return NextResponse.json({ data });
}
