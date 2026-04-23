import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const Body = z.object({
  position: z.number().int().min(1).max(200),
  answerIndex: z.number().int().min(0).max(10).nullable(),
  flagged: z.boolean().default(false),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuthenticatedUser();
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { position, answerIndex, flagged } = parsed.data;
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)("record_exam_answer", {
    p_user_id: user.id,
    p_session_id: params.id,
    p_position: position,
    p_answer_index: answerIndex,
    p_flagged: flagged,
  });

  if (error) {
    const msg = error.message ?? "Failed to record answer";
    const status = /deadline|not in progress|not found/i.test(msg) ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }

  return NextResponse.json({ ok: true });
}
