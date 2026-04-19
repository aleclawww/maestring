import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { NudgeEmail } from "@/lib/email/templates/NudgeEmail";
import { createMagicLink } from "@/lib/magic-links";
import { logger } from "@/lib/logger";
import * as React from "react";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env["CRON_SECRET"]}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Find users who have due cards and haven't studied today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: users } = await supabase.rpc("get_users_needing_nudge");

  if (!users || users.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  let failed = 0;

  for (const u of users) {
    try {
      const magicUrl = await createMagicLink(u.user_id, u.email, "study");

      // Pilar 5 — contexto real: readiness actual vs. último snapshot.
      // Snapshot se hace AL FINAL del envío para que el próximo email pueda
      // mostrar la pérdida desde este momento.
      const [readinessRes, profileRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase.rpc("get_exam_readiness" as any, { p_user_id: u.user_id }),
        supabase
          .from("profiles")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .select("last_readiness_score" as any)
          .eq("id", u.user_id)
          .maybeSingle(),
      ]);

      const readinessRow = Array.isArray(readinessRes.data) ? readinessRes.data[0] : null;
      const readinessNow = readinessRow?.score ?? null;
      const readinessPrev = (profileRes.data as { last_readiness_score?: number } | null)
        ?.last_readiness_score ?? null;
      const weakestDomain = readinessRow?.weakest_domain ?? undefined;

      await sendEmail({
        to: u.email,
        subject:
          u.streak_days > 0
            ? `🔥 Keep your ${u.streak_days}-day streak — ${u.due_count} cards waiting`
            : `📚 ${u.due_count} cards ready for review`,
        react: React.createElement(NudgeEmail, {
          firstName: u.first_name ?? "there",
          dueCount: u.due_count,
          streakDays: u.streak_days ?? 0,
          studyUrl: magicUrl,
          daysUntilExam: u.days_until_exam ?? undefined,
          readinessNow: readinessNow ?? undefined,
          readinessPrev: readinessPrev ?? undefined,
          weakestDomain,
        }),
        tags: [{ name: "type", value: "nudge" }],
      });

      // Refresh snapshot so the NEXT nudge can compute delta from this point.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.rpc("snapshot_readiness" as any, { p_user_id: u.user_id });

      sent++;
    } catch (err) {
      logger.error({ err, userId: u.user_id }, "Failed to send nudge email");
      failed++;
    }
  }

  logger.info({ sent, failed, total: users.length }, "Nudge cron completed");
  return NextResponse.json({ sent, failed, total: users.length });
}
