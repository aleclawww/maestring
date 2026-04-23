import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { StreakBrokenEmail } from "@/lib/email/templates/StreakBrokenEmail";
import { createMagicLink } from "@/lib/magic-links";
import { logger } from "@/lib/logger";
import { runCron } from "@/lib/cron/run";
import * as React from "react";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env["CRON_SECRET"]}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const outcome = await runCron("reminders", async () => {
    const supabase = createAdminClient();
    const { data: brokenStreaks } = await supabase.rpc("get_broken_streaks_today");

    if (!brokenStreaks || brokenStreaks.length === 0) {
      return { status: "ok" as const, rowsAffected: 0, metadata: { total: 0 } };
    }

    let sent = 0;
    let failed = 0;

    for (const u of brokenStreaks) {
      try {
        const magicUrl = await createMagicLink(u.user_id, u.email, "streak");
        await sendEmail({
          to: u.email,
          subject: `Your ${u.previous_streak}-day streak ended — bounce back today`,
          react: React.createElement(StreakBrokenEmail, {
            firstName: u.first_name ?? "there",
            previousStreak: u.previous_streak,
            studyUrl: magicUrl,
          }),
          tags: [{ name: "type", value: "streak-broken" }],
        });
        sent++;
      } catch (err) {
        logger.error({ err, userId: u.user_id }, "Failed to send streak broken email");
        failed++;
      }
    }

    return {
      status: "ok" as const,
      rowsAffected: sent,
      metadata: { total: brokenStreaks.length, sent, failed },
    };
  });

  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 500 });
  return NextResponse.json(outcome.result);
}
