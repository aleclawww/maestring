export const runtime = 'nodejs'

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
    const msg = error.message ?? ''
    const isConflict = /deadline|not in progress|not found/i.test(msg)
    const status = isConflict ? 409 : 500
    // Return a code-based error rather than the raw DB/RPC message so Postgres
    // internals (table names, constraint names) are never exposed to clients.
    return NextResponse.json(
      { error: isConflict ? 'exam_not_active' : 'record_failed' },
      { status }
    )
  }

  return NextResponse.json({ ok: true });
}
